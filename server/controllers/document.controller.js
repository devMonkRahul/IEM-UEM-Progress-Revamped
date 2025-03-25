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

export const getAllDocumentsBySuperAdmin = expressAsyncHandler(
  async (req, res) => {
    try {
      const { tableName } = req.body;

      if (!tableName) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "Invalid request data"
        );
      }

      // Sanitize table name (replace spaces with underscores)
      const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

      const DynamicModel = mongoose.models[sanitizedTableName];

      if (!DynamicModel) {
        return sendError(res, constants.VALIDATION_ERROR, "Model not found");
      }

      // Super Admin can retrieve all submitted documents
      const documents = await DynamicModel.find({ submitted: true }).populate(
        "submittedBy",
        "name email"
      );

      return sendSuccess(
        res,
        constants.OK,
        "Documents retrieved successfully",
        documents
      );
    } catch (error) {
      return sendServerError(res, error);
    }
  }
);

export const getAllDocumentsByUser = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName } = req.body;

    if (!tableName) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid request Data");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

    const DynamicModel = mongoose.models[sanitizedTableName];

    if (!DynamicModel) {
      return sendError(res, constants.VALIDATION_ERROR, "Model not found");
    }

    const documents = await DynamicModel.find({ submittedBy: req.user?._id });

    return sendSuccess(
      res,
      constants.OK,
      "Documents retrieved successfully",
      documents
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getAllDocumentsByModerator = expressAsyncHandler(
  async (req, res) => {
    try {
      const { tableName } = req.body;

      if (!tableName) {
        return sendError(
          res,
          constants.VALIDATION_ERROR,
          "Invalid request Data"
        );
      }

      // Sanitize table name (replace spaces with underscores)
      const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

      const DynamicModel = mongoose.models[sanitizedTableName];

      if (!DynamicModel) {
        return sendError(res, constants.VALIDATION_ERROR, "Model not found");
      }

      const documents = await DynamicModel.find({
        college: { $in: req.moderator.college },
        department: { $in: req.moderator.department },
        submitted: true,
      }).populate("submittedBy", "name email");

      return sendSuccess(
        res,
        constants.OK,
        "Documents retrieved successfully",
        documents
      );
    } catch (error) {
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

    const document = await DynamicModel.findOne({ _id: documentId });

    if (!document) {
      return sendError(res, constants.NO_CONTENT, "Document not found");
    }

    if (req.user && document.submittedBy !== req.user._id) {
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
        { status: status, moderatorComment: comment },
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

export const finalSubmission = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName } = req.body;

    if (!tableName) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid request Data");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

    const DynamicModel = mongoose.models[sanitizedTableName];

    if (!DynamicModel) {
      return sendError(res, constants.VALIDATION_ERROR, "Model not found");
    }

    const documentIds = await DynamicModel.find({
      submittedBy: req.user._id,
      submitted: false,
    }).select("_id");

    const documentIdsArray = documentIds.map((doc) => doc._id);

    const documents = await DynamicModel.updateMany(
      { _id: { $in: documentIdsArray } },
      { submitted: true },
      { new: true }
    );

    return sendSuccess(
      res,
      constants.OK,
      "Final Submission successfully",
      documents
    );
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
      const missingFields = requiredFields.filter((field) => !missingFieldsData.hasOwnProperty(field));

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