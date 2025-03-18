import mongoose from "mongoose";
import expressAsyncHandler from "express-async-handler";
import { constants, config } from "../constants.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";
import SchemaMeta from "../models/tableSchema.model.js";

export const createSchema = expressAsyncHandler(async (req, res) => {
  try {
    const { tableName, data } = req.body;

    if (!tableName || !data || !Array.isArray(data) || data.length === 0) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid request Data");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();

    console.log(mongoose.modelNames()); // Debugging: See all existing models

    // Check if model already exists
    if (mongoose.modelNames().includes(sanitizedTableName)) {
      return sendError(res, constants.CONFLICT, "Model already exists");
    }

    // Convert field types to Mongoose types (Stored as Strings)
    const typeMapping = {
      Text: "String",
      Number: "Number",
      Email: "String",
      File: "String", // Store file path or URL
    };

    const schemaDefinition = {};

    data.forEach((field) => {
      schemaDefinition[field.FieldName] = {
        type: typeMapping[field.FieldType] || "String", // Default to String if unknown
      };

      // Add required only if it's true
      if (field.FieldRequired === "True") {
        schemaDefinition[field.FieldName].required = true;
      }

      // Add unique only if it's true
      if (field.FieldUnique === "True") {
        schemaDefinition[field.FieldName].unique = true;
      }
    });

    // Add system fields (with correct format)
    schemaDefinition["status"] = {
      type: "String",
      default: "pending",
      enum: [
        "pending",
        "approved",
        "rejected",
        "requestedForApproval",
        "requestedForRejection",
      ],
    };

    schemaDefinition["submitted"] = {
      type: "Boolean",
      default: false,
    };

    schemaDefinition["submittedBy"] = {
      type: "ObjectId", // Store as string instead of Mongoose's `Schema.Types.ObjectId`
      ref: "User",
    };

    console.log("Formatted Schema:", schemaDefinition);

    // Create and register the Mongoose Schema dynamically
    const mongooseSchemaDefinition = {};
    Object.keys(schemaDefinition).forEach((key) => {
      let field = schemaDefinition[key];
      let newField = { ...field };

      // Convert type strings back to Mongoose Types
      const typeConversion = {
        String: String,
        Number: Number,
        Boolean: Boolean,
        ObjectId: mongoose.Schema.Types.ObjectId,
      };

      if (typeof field.type === "string" && typeConversion[field.type]) {
        newField.type = typeConversion[field.type];
      }

      mongooseSchemaDefinition[key] = newField;
    });

    const dynamicSchema = new mongoose.Schema(mongooseSchemaDefinition, {
      timestamps: true,
    });

    mongoose.model(sanitizedTableName, dynamicSchema);

    // Save SchemaMeta Reference (in correct format)
    await SchemaMeta.create({
      tableName: sanitizedTableName,
      schemaDefinition, // This is now in JSON format as required
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

    // Validate access key
    if (!accessKey || accessKey !== config.databaseAccessKey) {
      return sendError(
        res,
        constants.UNAUTHORIZED,
        "Access Denied, Valid Access Key Required"
      );
    }

    if (!schemaId) {
      return sendError(res, constants.VALIDATION_ERROR, "Invalid Schema ID");
    }

    // Find and delete schema from SchemaMeta
    const schema = await SchemaMeta.findByIdAndDelete(schemaId);
    if (!schema) {
      return sendError(res, constants.NO_CONTENT, "Schema not found");
    }

    // Convert table name to lowercase (as done in createSchema)
    const sanitizedTableName = schema.tableName.replace(/\s+/g, "_").toLowerCase();

    // Delete Mongoose Schema
  

    // Completely remove Mongoose Model
    if (mongoose.models[sanitizedTableName]) {
      await mongoose.models[sanitizedTableName].deleteMany();
      delete mongoose.models[sanitizedTableName]; // Remove from models
    }
    if (mongoose.connection.models[sanitizedTableName]) {
      delete mongoose.connection.models[sanitizedTableName]; // Remove from connection cache
    }
    

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
      return sendError(
        res,
        constants.UNAUTHORIZED,
        "Access Denied, Valid Access Key Required"
      );
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

    return sendSuccess(
      res,
      constants.OK,
      "Schema updated successfully",
      updatedTable
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});
