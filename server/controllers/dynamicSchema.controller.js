import mongoose from "mongoose";
import expressAsyncHandler from "express-async-handler";
import { constants } from "../constants.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";

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

    return sendSuccess(
      res,
      constants.OK,
      "Dynamic Schema created successfully",
      {tableName: sanitizedTableName}
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});
