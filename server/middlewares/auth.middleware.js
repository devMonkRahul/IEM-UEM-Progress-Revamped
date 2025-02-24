import SuperAdmin from "../models/superAdmin.model.js";
import expressAsyncHandler from "express-async-handler";
import { sendServerError, sendUnauthorized } from "../utils/response.utils.js";
import jwt from "jsonwebtoken";
import { config } from "../constants.js";

export const verifySuperAdmin = expressAsyncHandler(async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return sendUnauthorized(res, "Access denied. No token provided");
        }

        const decoded = jwt.verify(token, config.accessTokenSecret);
        const superAdmin = await SuperAdmin.findById(decoded?._id).select("-password");

        if (!superAdmin) {
            return sendUnauthorized(res, "Invalid token");
        }

        req.superAdmin = superAdmin;
        next();
    } catch (error) {
        return sendServerError(res, error);
    }
});