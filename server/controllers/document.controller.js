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
        const sanitizedTableName = tableName.replace(/\s+/g, "_");

        const DynamicModel = mongoose.models[sanitizedTableName];

        if (!DynamicModel) {
            return sendError(res, constants.VALIDATION_ERROR, "Model not found");
        }
    
        const document = await DynamicModel.create(data);

        return sendSuccess(res, constants.OK, "Document created successfully", document);
    } catch (error) {
        return sendServerError(res, error);
    }
});