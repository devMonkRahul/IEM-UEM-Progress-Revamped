import mongoose from "mongoose";
import expressAsyncHandler from "express-async-handler";
import { constants, config } from "../constants.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";
import TableSchema from "../models/tableSchema.model.js";

export const createSchema = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName, data } = req.body;

    if (!tableName || !data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid request Data");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_");

    // Check if model already exists
    if (mongoose.models[sanitizedTableName]) {
      return sendError(res, constants.CONFLICT, "Model already exists");
    }

    // Convert field types to Mongoose types
    const typeMapping = {
      Text: String,
      Number: Number,
      Email: String,
      File: String, // Store file path or URL
    };

    const schemaDefinition = {};

    data.forEach((field) => {
      schemaDefinition[field.FieldName] = {
        type: typeMapping[field.FieldType] || String, // Default to String if unknown
        required: field.FieldRequired === "True",
        unique: field.FieldUnique === "True",
      };
    });

    // Create Mongoose Schema
    const dynamicSchema = new mongoose.Schema(schemaDefinition, {
      timestamps: true,
    });

    // Create Mongoose Model
    const DynamicModel = mongoose.model(sanitizedTableName, dynamicSchema);

    // Save Schema Reference (Optional)
    const testData = await DynamicModel.create({
      Name: "Kunal",
      Email: "kunal@example.com",
      Age: 25,
      Pdf: "path/to/file.pdf",
    });

    // Delete test data
    await DynamicModel.findByIdAndDelete(testData._id);

    // Save Schema Definition
    await TableSchema.create({
      tableName: sanitizedTableName,
      tableFields: data,
    });

    return sendSuccess(
      res,
      constants.OK,
      "Dynamic Schema created successfully",
      { tableName: sanitizedTableName }
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getAllSchemas = expressAsyncHandler(async (req, res) => {
  try {
    const schemas = await TableSchema.find();

    if (!schemas || schemas.length === 0) {
      return sendSuccess(res, constants.OK, "No Schemas found", []);
    }

    return sendSuccess(res, constants.OK, "All Schemas", schemas);
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getSchemaById = expressAsyncHandler(async (req, res) => {
  try {
    const { schemaId } = req.params;

    if (!schemaId) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid Schema ID");
    }

    const schema = await TableSchema.findById(schemaId);

    if (!schema) {
      return sendError(res, constants.NO_CONTENT, "Schema not found");
    }

    return sendSuccess(res, constants.OK, "Schema Details", schema);
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const deleteSchema = expressAsyncHandler(async (req, res) => {
  try {
    const { schemaId } = req.params;

    const { accessKey } = req.body;

    if (!accessKey || accessKey !== config.databaseAccessKey) {
      return sendError(res, constants.UNAUTHORIZED, "Access Denied, Valid Access Key Required");
    }

    if (!schemaId) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid Schema ID");
    }

    const schema = await TableSchema.findByIdAndDelete(schemaId);

    if (!schema) {
      return sendError(res, constants.NO_CONTENT, "Schema not found");
    }

    // Delete Mongoose Model
    const sanitizedTableName = schema.tableName.replace(/\s+/g, "_");
    delete mongoose.models[sanitizedTableName];

    return sendSuccess(res, constants.OK, "Schema deleted successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const updateSchema = expressAsyncHandler(async (req, res) => {
  try {
    const { schemaId } = req.params;
    const { tableName, data, accessKey } = req.body;

    if (!accessKey || accessKey !== config.databaseAccessKey) {
      return sendError(res, constants.UNAUTHORIZED, "Access Denied, Valid Access Key Required");
    }

    if (
      !schemaId ||
      !tableName ||
      !data ||
      !Array.isArray(data) ||
      data.length === 0
    ) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid request Data");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_");

    // Check if model exists
    if (!mongoose.models[sanitizedTableName]) {
      return sendError(res, constants.NO_CONTENT, "Model is not found");
    }

    const updatedTable = await TableSchema.findByIdAndUpdate(schemaId, {
      tableName: sanitizedTableName,
      tableFields: data,
    });

    return sendSuccess(res, constants.OK, "Schema updated successfully", updatedTable);
  } catch (error) {
    return sendServerError(res, error);
  }
});
