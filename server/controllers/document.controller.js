import expressAsyncHandler from "express-async-handler";
import { constants } from "../constants.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";
import mongoose from "mongoose";

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
      });

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
