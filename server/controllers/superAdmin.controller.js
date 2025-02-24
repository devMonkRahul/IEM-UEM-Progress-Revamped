import SuperAdmin from "../models/superAdmin.model.js";
import expressAsyncHandler from "express-async-handler";
import { constants } from "../constants.js";
import { sendSuccess, sendError, sendServerError } from "../utils/response.utils.js";

// Create a new SuperAdmin
export const createSuperAdmin = expressAsyncHandler(async (req, res) => {
    try {
        const { name, email, address, phone, password } = req.body;
    
        if (!name || !email || !address || !phone || !password) {
            return sendError(res, constants.VALIDATION_ERROR, "Please fill all the fields");
        }
    
        const superAdminExists = await SuperAdmin.findOne({ email });
        if (superAdminExists) {
            return sendError(res, constants.CONFLICT, "SuperAdmin already exists");
        }
    
        const superAdmin = await SuperAdmin.create({
            name,
            email,
            address,
            phone,
            password,
        });
    
        return sendSuccess(res, constants.OK, "SuperAdmin created successfully", superAdmin);
    } catch (error) {
        return sendServerError(res, error); 
    }
});

export const loginSuperAdmin = expressAsyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;
    
        if (!email || !password) {
            return sendError(res, constants.VALIDATION_ERROR, "Please fill all the fields");
        }
    
        const superAdmin = await SuperAdmin.findOne({ email });
        if (!superAdmin) {
            return sendError(res, constants.VALIDATION_ERROR, "SuperAdmin not found");
        }
    
        const isPasswordCorrect = await superAdmin.isPasswordCorrect(password);
        if (!isPasswordCorrect) {
            return sendError(res, constants.UNAUTHORIZED, "Invalid credentials");
        }
    
        const accessToken = superAdmin.generateAccessToken();
        return sendSuccess(res, constants.OK, "SuperAdmin logged in successfully", { accessToken });
    } catch (error) {
        return sendServerError(res, error); 
    }
});

export const getSuperAdminProfile = expressAsyncHandler(async (req, res) => {
    try {
        return sendSuccess(res, constants.OK, "SuperAdmin profile fetched successfully", req.superAdmin);
    } catch (error) {
        return sendServerError(res, error); 
    }
});