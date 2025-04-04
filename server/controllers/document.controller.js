import expressAsyncHandler from "express-async-handler";
import { constants } from "../constants.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";
import mongoose from "mongoose";
import XLSX from "xlsx";
import fs from "fs";
import SchemaMeta from "../models/tableSchema.model.js";
import RawSchemaMeta from "../models/rawTableSchema.model.js";
import User from "../models/user.model.js";
import { uploadFile, generateSignedUrl } from "../utils/s3Upload.utils.js";
import dotenv from 'dotenv';
dotenv.config();

export const createDocument = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName, data } = req.body;

    if (!tableName || !data) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid request Data");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

    const DynamicModel = mongoose.models[sanitizedTableName];

    if (!DynamicModel) {
      return sendError(res, constants.VALIDATION_ERROR, "Model not found");
    }

    data["submittedBy"] = req.user._id;
    data["college"] = req.user.college;
    data["department"] = req.user.department;

    const document = await DynamicModel.create(data);

    return sendSuccess(
      res,
      constants.OK,
      "Document created successfully",
      document
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const editDocument = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName, documentId, data } = req.body;

    if (!tableName || !documentId || !data) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid request Data");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

    const DynamicModel = mongoose.models[sanitizedTableName];

    if (!DynamicModel) {
      return sendError(res, constants.VALIDATION_ERROR, "Model not found");
    }

    const doc = await DynamicModel.findById(documentId);

    if (!doc) {
      return sendError(res, constants.NO_CONTENT, "Document not found");
    }

    if (doc.status !== "rejected") {
      return sendError(
        res,
        constants.FORBIDDEN,
        "Document is not in a state to be edited"
      );
    }

    const document = await DynamicModel.findOneAndUpdate(
      { _id: documentId },
      { ...data, status: "pending", submitted: false },
      { new: true }
    );

    return sendSuccess(
      res,
      constants.OK,
      "Document updated successfully",
      document
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const deleteDocument = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName, documentId } = req.body;

    if (!tableName || !documentId) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid request Data");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

    const DynamicModel = mongoose.models[sanitizedTableName];

    if (!DynamicModel) {
      return sendError(res, constants.VALIDATION_ERROR, "Model not found");
    }

    const document = await DynamicModel.findByIdAndDelete({ _id: documentId });

    return sendSuccess(
      res,
      constants.OK,
      "Document deleted successfully",
      document
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getAllDocumentsBySuperAdmin = expressAsyncHandler(
  async (req, res) => {
    try {
      const { tableName, startDate, endDate, college, status, department } =
        req.body;
      const { page = 1, limit = 10 } = req.query;
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      const skip = (pageNumber - 1) * limitNumber;

      if (!tableName) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "Table name is required"
        );
      }

      let query = {};

      if (startDate && endDate) {
        if (new Date(startDate) > new Date(endDate)) {
          return sendError(
            res,
            constants.VALIDATION_ERROR,
            "Start date cannot be greater than end date"
          );
        }
        query["createdAt"] = { $gte: startDate, $lte: endDate };
      }

      if (college) {
        query["college"] = college;
      }

      if (department) {
        query["department"] = department;
      }

      if (status) {
        if (["approved", "rejected"].includes(status)) {
          query["status"] = status;
        } else {
          query["$or"] = [
            { status: "requestedForApproval" },
            { status: "requestedForRejection" },
          ];
        }
      } else {
        query["$or"] = [
          { status: "requestedForApproval" },
          { status: "requestedForRejection" },
          { status: "approved" },
          { status: "rejected" },
        ];
      }

      // Sanitize table name (replace spaces with underscores)
      const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

      const DynamicModel = mongoose.models[sanitizedTableName];

      if (!DynamicModel) {
        return sendError(res, constants.VALIDATION_ERROR, "Model not found");
      }

      // Super Admin can retrieve all submitted documents
      const documents = await DynamicModel.find(query)
        .populate("submittedBy", "name email")
        .populate("reviewedModerator", "name email goAsPerModerator")
        .skip(skip)
        .limit(limitNumber)
        .exec();

      // Use the same query for counting documents
      const countDocument = await DynamicModel.countDocuments(query);

      return sendSuccess(
        res,
        constants.OK,
        "Documents retrieved successfully",
        {
          documents,
          pagination: {
            currentPage: pageNumber,
            totalPages: Math.ceil(countDocument / limitNumber),
            countDocument,
          },
        }
      );
    } catch (error) {
      return sendServerError(res, error);
    }
  }
);

export const getAllDocumentsByDepartmentBySuperAdmin = expressAsyncHandler(
  async (req, res) => {
    try {
      const { college } = req.body;
      if (!college)
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "College is required"
        );

      const allUsers = await User.find({ college }).select(
        "department college"
      );
      const allDepartments = allUsers.map((user) => user.department);
      const allTables = await SchemaMeta.find({}).select("tableName");
      const tableNames = allTables.map((table) => table.tableName);

      let allDocuments = [];

      await Promise.all(
        allDepartments.map(async (department) => {
          let pendingCount = 0;
          let approvedCount = 0;
          let rejectedCount = 0;

          await Promise.all(
            tableNames.map(async (tableName) => {
              const DynamicModel = mongoose.models[tableName];
              if (!DynamicModel) return;
              const documents = await DynamicModel.find({ department });
              documents.map((document) => {
                if (
                  document.status === "requestedForApproval" ||
                  document.status === "requestedForRejection"
                ) {
                  pendingCount++;
                } else if (document.status === "approved") {
                  approvedCount++;
                } else if (document.status === "rejected") {
                  rejectedCount++;
                }
              });
            })
          );

          allDocuments.push({
            department,
            pendingCount,
            approvedCount,
            rejectedCount,
          });
        })
      );

      return sendSuccess(
        res,
        constants.OK,
        "Documents retrieved successfully",
        allDocuments
      );
    } catch (error) {
      return sendServerError(res, error);
    }
  }
);

export const getGoAsPerModeratorVerifiedDocuments = expressAsyncHandler(
  async (req, res) => {
    try {
      const { startDate, endDate, college } = req.body;

      const allTables = await SchemaMeta.find({}).select("tableName");
      const tableNames = allTables.map((table) => table.tableName);

      let allDocuments = [];

      let query = {
        $or: [
          { status: "requestedForApproval" },
          { status: "requestedForRejection" },
          { status: "approved" },
          { status: "rejected" },
        ],
      };
      if (startDate && endDate) {
        if (new Date(startDate) > new Date(endDate)) {
          return sendError(
            res,
            constants.VALIDATION_ERROR,
            "Start date cannot be greater than end date"
          );
        }
        query["createdAt"] = { $gte: startDate, $lte: endDate };
      }

      if (college) {
        query["college"] = college;
      }

      await Promise.all(
        tableNames.map(async (tableName) => {
          const DynamicModel = mongoose.models[tableName];

          if (!DynamicModel) return;

          const documents = await DynamicModel.find(query)
            .populate("submittedBy", "name email")
            .populate("reviewedModerator", "name email goAsPerModerator")
            .exec();

          const filteredDocuments = documents.filter(
            (doc) => doc.reviewedModerator.goAsPerModerator === true
          );

          allDocuments.push({
            tableName,
            documents: filteredDocuments,
          });
        })
      );

      return sendSuccess(
        res,
        constants.OK,
        "Documents retrieved successfully",
        allDocuments
      );
    } catch (error) {
      return sendServerError(res, error);
    }
  }
);

export const getAllDocumentsByUser = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName, startDate, endDate } = req.body;
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const skip = (pageNumber - 1) * limitNumber;

    if (!tableName) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid request Data");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

    const DynamicModel = mongoose.models[sanitizedTableName];

    if (!DynamicModel) {
      return sendError(res, constants.VALIDATION_ERROR, "Model not found");
    }

    // Create query object
    let query = {
      submittedBy: req.user?._id,
      $or: [
        { submitted: false },
        { status: "rejected" },
        { status: "approved" },
      ],
    };

    // Add date range filtering if provided
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "Start date cannot be greater than end date"
        );
      }
      query["createdAt"] = { $gte: startDate, $lte: endDate };
    }

    const documents = await DynamicModel.find(query)
      .skip(skip)
      .limit(limitNumber)
      .exec();

    const countDocument = await DynamicModel.countDocuments(query);

    return sendSuccess(res, constants.OK, "Documents retrieved successfully", {
      documents,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(countDocument / limitNumber),
        countDocument,
      },
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getAllDocumentsByModerator = expressAsyncHandler(
  async (req, res) => {
    try {
      const { tableName, startDate, endDate, status, department } = req.body;
      const { page = 1, limit = 10 } = req.query;
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      const skip = (pageNumber - 1) * limitNumber;

      if (!tableName) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "Table name is required"
        );
      }

      if (!req.moderator.department.includes(department)) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "You are not authorized to view this department's documents"
        );
      }

      // Sanitize table name (replace spaces with underscores)
      const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

      const DynamicModel = mongoose.models[sanitizedTableName];

      if (!DynamicModel) {
        return sendError(res, constants.VALIDATION_ERROR, "Model not found");
      }

      // Check if moderator exists and has college/department info
      if (
        !req.moderator ||
        !req.moderator.college ||
        !req.moderator.department
      ) {
        return sendError(
          res,
          constants.UNAUTHORIZED,
          "Moderator not authenticated or lacks required permissions"
        );
      }

      let moderatorQuery = {
        college: { $in: req.moderator.college },

        submitted: true,
      };

      if (status) {
        if (!["approved", "rejected"].includes(status)) {
          moderatorQuery["status"] = status;
        }
      }

      if (department) {
        moderatorQuery["department"] = department;
      } else {
        moderatorQuery["department"] = { $in: req.moderator.department };
      }

      // Add date range filtering if provided
      if (startDate && endDate) {
        if (new Date(startDate) > new Date(endDate)) {
          return sendError(
            res,
            constants.VALIDATION_ERROR,
            "Start date cannot be greater than end date"
          );
        }
        moderatorQuery["createdAt"] = { $gte: startDate, $lte: endDate };
      }

      const documents = await DynamicModel.find(moderatorQuery)
        .populate("submittedBy", "name email")
        .skip(skip)
        .limit(limitNumber)
        .exec();

      const countDocument = await DynamicModel.countDocuments(moderatorQuery);

      return sendSuccess(
        res,
        constants.OK,
        "Documents retrieved successfully",
        {
          documents,
          pagination: {
            currentPage: pageNumber,
            totalPages: Math.ceil(countDocument / limitNumber),
            countDocument,
          },
        }
      );
    } catch (error) {
      console.error("Error in getAllDocumentsByModerator:", error);
      return sendServerError(res, error);
    }
  }
);

export const getDocumentById = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName, documentId } = req.body;

    if (!tableName || !documentId) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid request Data");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

    const DynamicModel = mongoose.models[sanitizedTableName];

    if (!DynamicModel) {
      return sendError(res, constants.VALIDATION_ERROR, "Model not found");
    }

    const { schemaDefinition } = await RawSchemaMeta.findOne({
      tableName: sanitizedTableName,
    });

    // Find fields where type is 'File'
    const fileField = Object.keys(schemaDefinition).filter(
      (key) => schemaDefinition[key].type === "File"
    );

    const document = await DynamicModel.findOne({ _id: documentId });

    if (!document) {
      return sendError(res, constants.NO_CONTENT, "Document not found");
    }

    if (req.user && !req.user._id.equals(document.submittedBy)) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "You are not authorized to view this document"
      );
    }

    if (
      req.moderator &&
      (!req.moderator.department.includes(document.department) ||
        !req.moderator.college.includes(document.college))
    ) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "You are not authorized to view this document"
      );
    }

    if (fileField && document[fileField]) {
      try {
        document[fileField] = await generateSignedUrl(document[fileField]);
      } catch (error) {
        console.error("Error generating signed URL", error);
      }
    }

    return sendSuccess(
      res,
      constants.OK,
      "Document retrieved successfully",
      document
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const verifyDocumentByModerator = expressAsyncHandler(
  async (req, res) => {
    try {
      const { tableName, documentId, status, comment } = req.body;

      if (!tableName || !documentId) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "Invalid request Data"
        );
      }

      if (!["requestedForApproval", "requestedForRejection"].includes(status)) {
        return sendError(res, constants.VALIDATION_ERROR, "Invalid status");
      }

      if (
        status === "requestedForRejection" &&
        (!comment || comment.trim() === "")
      ) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "Comment is required for rejection"
        );
      }

      // Sanitize table name (replace spaces with underscores)
      const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

      const DynamicModel = mongoose.models[sanitizedTableName];

      if (!DynamicModel) {
        return sendError(res, constants.VALIDATION_ERROR, "Model not found");
      }

      const document = await DynamicModel.findOneAndUpdate(
        { _id: documentId },
        {
          status: status,
          moderatorComment: comment,
          reviewedModerator: req.moderator._id,
        },
        { new: true }
      );

      return sendSuccess(
        res,
        constants.OK,
        "Document verified successfully",
        document
      );
    } catch (error) {
      return sendServerError(res, error);
    }
  }
);

export const verifyDocumentBySuperAdmin = expressAsyncHandler(
  async (req, res) => {
    try {
      const { tableName, documentId, status, comment } = req.body;

      if (!tableName || !documentId) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "Invalid request Data"
        );
      }

      if (!["approved", "rejected"].includes(status)) {
        return sendError(res, constants.VALIDATION_ERROR, "Invalid status");
      }

      if (status === "rejected" && (!comment || comment.trim() === "")) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "Comment is required for rejection"
        );
      }

      // Sanitize table name (replace spaces with underscores)
      const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

      const DynamicModel = mongoose.models[sanitizedTableName];

      if (!DynamicModel) {
        return sendError(res, constants.VALIDATION_ERROR, "Model not found");
      }

      const document = await DynamicModel.findOneAndUpdate(
        { _id: documentId },
        { status: status, superAdminComment: comment },
        { new: true }
      );

      return sendSuccess(
        res,
        constants.OK,
        "Document verified successfully",
        document
      );
    } catch (error) {
      return sendServerError(res, error);
    }
  }
);

export const preViewFinalSubmission = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName } = req.body;
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const skip = (pageNumber - 1) * limitNumber;

    if (!tableName) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Table name is required"
      );
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

    const DynamicModel = mongoose.models[sanitizedTableName];

    if (!DynamicModel) {
      return sendError(res, constants.VALIDATION_ERROR, "Model not found");
    }

    const query = {
      submittedBy: req.user._id,
      submitted: false,
    };

    const documents = await DynamicModel.find(query)
      .skip(skip)
      .limit(limitNumber)
      .exec();

    const countDocument = await DynamicModel.countDocuments(query);

    return sendSuccess(res, constants.OK, "Documents retrieved successfully", {
      documents,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(countDocument / limitNumber),
        countDocument,
      },
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const finalSubmission = expressAsyncHandler(async (req, res) => {
  try {
    const allTables = await SchemaMeta.find({}).select("tableName");
    const tableNames = allTables.map((table) => table.tableName);

    await Promise.all(
      tableNames.map(async (tableName) => {
        const DynamicModel = mongoose.models[tableName];

        if (!DynamicModel) return;

        const documentIds = await DynamicModel.find({
          submittedBy: req.user._id,
          submitted: false,
        }).select("_id");

        const documentIdsArray = documentIds.map((doc) => doc._id);

        await DynamicModel.updateMany(
          { _id: { $in: documentIdsArray } },
          { submitted: true },
          { new: true }
        );
      })
    );

    return sendSuccess(res, constants.OK, "Final Submission successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const bulkUpload = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName } = req.body;
    const { file } = req;

    if (!file) {
      return sendError(res, constants.VALIDATION_ERROR, "No file uploaded");
    }

    if (!tableName) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Table name is required"
      );
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

    const DynamicModel = mongoose.models[sanitizedTableName];

    if (!DynamicModel) {
      return sendError(res, constants.VALIDATION_ERROR, "Model not found");
    }

    const tableSchema = await SchemaMeta.findOne({
      tableName: sanitizedTableName,
    });
    if (!tableSchema) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Table schema not found"
      );
    }

    const requiredFields = Object.keys(tableSchema.schemaDefinition).filter(
      (field) =>
        ![
          "_id",
          "status",
          "submitted",
          "submittedBy",
          "college",
          "department",
          "moderatorComment",
          "superAdminComment",
          "reviewedModerator",
        ].includes(field)
    );

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    // Delete the uploaded file
    fs.unlinkSync(file.path);

    if (!jsonData || jsonData.length === 0) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "No data found in the file"
      );
    }

    const missingFieldsData = jsonData.find((data) =>
      requiredFields.some((field) => !data.hasOwnProperty(field))
    );

    if (missingFieldsData) {
      const missingFields = requiredFields.filter(
        (field) => !missingFieldsData.hasOwnProperty(field)
      );

      return sendError(
        res,
        constants.VALIDATION_ERROR,
        `Missing fields in the file: ${missingFields.join(", ")}`
      );
    }

    jsonData.forEach((data) => {
      data["submittedBy"] = req.user._id;
      data["college"] = req.user.college;
      data["department"] = req.user.department;
    });

    const uploadedData = await DynamicModel.insertMany(jsonData);

    return sendSuccess(
      res,
      constants.OK,
      "Bulk Data uploaded successfully",
      uploadedData
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const uploadDocumentFile = expressAsyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, constants.VALIDATION_ERROR, "No file given");
    }

    const file = await uploadFile(req.file);

    return sendSuccess(res, constants.OK, "File uploaded successfully", file);
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const verifyManyDocumentBySuperAdmin = expressAsyncHandler(
  async (req, res) => {
    try {
      const { tableName, department, status } = req.body;

      if (!tableName || !department || !status) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "Table name, department and status are required"
        );
      }

      const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();
      const DynamicModel = mongoose.models[sanitizedTableName];

      if (!DynamicModel) {
        return sendError(res, constants.VALIDATION_ERROR, "Model not found");
      }

      const documents = await DynamicModel.find({
        department,
        status:
          status === "approved"
            ? "requestedForApproval"
            : "requestedForRejection",
      }).populate("reviewedModerator", "goAsPerModerator");

      const filteredDocuments = documents.filter(
        (doc) => doc.reviewedModerator.goAsPerModerator === true
      );
      const documentIds = filteredDocuments.map((doc) => doc._id);

      if (documentIds.length === 0) {
        return sendError(
          res,
          constants.NO_CONTENT,
          "No documents found to update"
        );
      }

      const updatedDocuments = await DynamicModel.updateMany(
        { _id: { $in: documentIds } },
        { status },
        { new: true }
      );

      if (updatedDocuments.nModified === 0) {
        return sendError(
          res,
          constants.NO_CONTENT,
          "No documents found to update"
        );
      }

      return sendSuccess(
        res,
        constants.OK,
        "Documents approved successfully",
        updatedDocuments
      );
    } catch (error) {
      return sendServerError(res, error);
    }
  }
);
