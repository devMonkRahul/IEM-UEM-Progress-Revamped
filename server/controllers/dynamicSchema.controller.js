import mongoose from "mongoose";
import expressAsyncHandler from "express-async-handler";
import { constants, config } from "../constants.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";
import SchemaMeta from "../models/tableSchema.model.js";
import RawSchemaMeta from "../models/rawTableSchema.model.js";

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
    const rawSchemaDefinition = {};

    data.forEach((field) => {
      const fieldName = field.FieldName?.trim();
      if (fieldName) {
        const sanitizedFieldName = fieldName.replace(/\s+/g, "_")?.toLowerCase();
        schemaDefinition[sanitizedFieldName] = {
          type: typeMapping[field.FieldType] || "String", // Default to String if unknown
        };

        rawSchemaDefinition[sanitizedFieldName] = {
          type: field.FieldType,
        }

        if (field.placeholder.trim() !== "") {
          schemaDefinition[sanitizedFieldName].default = field.placeholder;
          rawSchemaDefinition[sanitizedFieldName].placeholder = field.placeholder;
        }

        // Add required only if it's true
        if (field.FieldRequired === "true") {
          schemaDefinition[sanitizedFieldName].required = true;
          rawSchemaDefinition[sanitizedFieldName].required = true;
        }

        // Add unique only if it's true
        if (field.FieldUnique === "true") {
          schemaDefinition[sanitizedFieldName].unique = true;
          rawSchemaDefinition[sanitizedFieldName].unique = true;
        }
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

    if (!schemaDefinition["college"]) {
      schemaDefinition["college"] = {
        type: "String",
      }
    }

    if (!schemaDefinition["department"]) {
      schemaDefinition["department"] = {
        type: "String",
      }
    }

    schemaDefinition["moderatorComment"] = {
      type: "String",
      default: "",
    };

    schemaDefinition["superAdminComment"] = {
      type: "String",
      default: "",
    };

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
    const schema = await SchemaMeta.create({
      tableName: sanitizedTableName,
      schemaDefinition, // This is now in JSON format as required
    });

    await RawSchemaMeta.create({
      tableName: sanitizedTableName,
      schemaDefinition: rawSchemaDefinition,
      schemaId: schema._id,
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
    const schemas = await RawSchemaMeta.find();

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

    const schema = await SchemaMeta.findById(schemaId);

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
    const schema = await RawSchemaMeta.findByIdAndDelete(schemaId);
    if (!schema) {
      return sendError(res, constants.NO_CONTENT, "Schema not found");
    }

    await SchemaMeta.findByIdAndDelete(schema.schemaId);

    // Convert table name to lowercase (as done in createSchema)
    const sanitizedTableName = schema.tableName
      .replace(/\s+/g, "_")
      .toLowerCase();

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

    const schema = await RawSchemaMeta.findById(schemaId);

    if (!schema) {
      return sendError(res, constants.NO_CONTENT, "Schema not found");
    }

    // Sanitize table name (replace spaces with underscores)
    const sanitizedTableName = schema.tableName
      .replace(/\s+/g, "_")
      .toLowerCase();

    // Check if model exists
    if (!mongoose.modelNames().includes(sanitizedTableName)) {
      return sendError(res, constants.NO_CONTENT, "Model is not found");
    }

    // Completely remove Mongoose Model
    if (mongoose.models[sanitizedTableName]) {
      await mongoose.models[sanitizedTableName].deleteMany();
      delete mongoose.models[sanitizedTableName]; // Remove from models
    }
    if (mongoose.connection.models[sanitizedTableName]) {
      delete mongoose.connection.models[sanitizedTableName]; // Remove from connection cache
    }

    // Convert field types to Mongoose types (Stored as Strings)
    const typeMapping = {
      Text: "String",
      Number: "Number",
      Email: "String",
      File: "String", // Store file path or URL
    };

    const schemaDefinition = {};
    const rawSchemaDefinition = {};

    data.forEach((field) => {
      const fieldName = field.FieldName?.trim();
      if (fieldName) {
        const sanitizedFieldName = fieldName.replace(/\s+/g, "_")?.toLowerCase();
      schemaDefinition[sanitizedFieldName] = {
        type: typeMapping[field.FieldType] || "String", // Default to String if unknown
      };

      rawSchemaDefinition[sanitizedFieldName] = {
        type: field.FieldType,
      }

      if (field.placeholder.trim() !== "") {
        schemaDefinition[sanitizedFieldName].default = field.placeholder;
        rawSchemaDefinition[sanitizedFieldName].placeholder = field.placeholder;
      }

      // Add required only if it's true
      if (field.FieldRequired === "true") {
        schemaDefinition[sanitizedFieldName].required = true;
        rawSchemaDefinition[sanitizedFieldName].required = true;
      }

      // Add unique only if it's true
      if (field.FieldUnique === "true") {
        schemaDefinition[sanitizedFieldName].unique = true;
        rawSchemaDefinition[sanitizedFieldName].unique = true;
      }
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

    if (!schemaDefinition["college"]) {
      schemaDefinition["college"] = {
        type: "String",
      }
    }

    if (!schemaDefinition["department"]) {
      schemaDefinition["department"] = {
        type: "String",
      }
    }

    schemaDefinition["moderatorComment"] = {
      type: "String",
      default: "",
    };

    schemaDefinition["superAdminComment"] = {
      type: "String",
      default: "",
    };

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

    const sanitizedUpdateTableName = tableName
      .replace(/\s+/g, "_")
      .toLowerCase();

    console.log(mongoose.modelNames()); // Debugging: See all existing models

    await SchemaMeta.findByIdAndUpdate(
      schema.schemaId,
      {
        tableName: sanitizedUpdateTableName,
        schemaDefinition, // This is now in JSON format as required
      },
      { new: true }
    );

    const updatedRawTable = await RawSchemaMeta.findByIdAndUpdate(
      schemaId,
      {
        tableName: sanitizedUpdateTableName,
        schemaDefinition: rawSchemaDefinition,
      },
      { new: true }
    );

    if (!updatedRawTable) {
      return sendError(res, constants.NO_CONTENT, "Schema not found");
    }

    return sendSuccess(
      res,
      constants.OK,
      "Schema updated successfully",
      updatedRawTable
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});
