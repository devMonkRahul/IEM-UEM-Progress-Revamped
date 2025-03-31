import User from "../models/user.model.js";
import OTP from "../models/otp.model.js";
import SchemaMeta from "../models/tableSchema.model.js";
import expressAsyncHandler from "express-async-handler";
import { constants } from "../constants.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";
import bcrypt from "bcrypt";
import { generateRandomPassword } from "../utils/generateRandomPassword.utils.js";
import { generateOTPCode } from "../utils/generateOTP.utils.js";
import {
  sendEmail,
  generatePasswordMessage,
  generateForgotPasswordOTPMessage,
} from "../utils/mailer.utils.js";
import mongoose from "mongoose";

const getDocumentCountOfDepartments = async (user, tableNames) => {
  let totalSubmission = 0;
  let rejectedCount = 0;
  let pendingCount = 0;
  let acceptedCount = 0;

  await Promise.all(
    tableNames.map(async (tableName) => {
      // Sanitize table name (replace spaces with underscores)
      const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();
      const DynamicModel = mongoose.models[sanitizedTableName];

      if (!DynamicModel) return; // Skip if model not found

      // Fetch all documents in a single query
      const documents = await DynamicModel.find({ submittedBy: user._id, submitted: true }, "status");

      totalSubmission += documents.length;

      documents.forEach((doc) => {
        if (doc.status === "approved") {
          acceptedCount += 1;
        } else if (doc.status === "rejected") {
          rejectedCount += 1;
        } else if (["pending", "requestedForApproval", "requestedForRejection"].includes(doc.status)) {
          pendingCount += 1;
        }
      });
    })
  );

  return {
    ...user.toObject(),
    totalSubmission,
    acceptedCount,
    rejectedCount,
    pendingCount,
  };
};

export const createUser = expressAsyncHandler(async (req, res) => {
  try {
    const { name, email, phone, department, college } = req.body;

    if (!name || !email || !phone || !department || !college) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Please fill all the fields"
      );
    }

    const tempPassword = generateRandomPassword();

    if (await User.findOne({ email })) {
      return sendError(res, constants.CONFLICT, "User already exists");
    }

    // Hash tempPassword before storing
    const salt = await bcrypt.genSalt(10);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);

    const user = await User.create({
      name,
      email,
      phone,
      department,
      tempPassword: hashedTempPassword,
      college,
    });

    const { message, messageHTML } = generatePasswordMessage(
      email,
      tempPassword,
      `User, Department: ${department[0]}`
    );

    await sendEmail(email, "Account Credentials", message, messageHTML);
    return sendSuccess(
      res,
      constants.OK,
      "User created successfully. Check your email for login credentials",
      user
    );
  } catch (error) {
    console.error("Error creating user: ", error);
    return sendServerError(res, error);
  }
});

export const loginUser = expressAsyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Please fill all the fields"
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, constants.VALIDATION_ERROR, "User not found");
    }
    if (user.tempPassword === "") {
      const isPasswordCorrect = await user.isPasswordCorrect(password);
      if (!isPasswordCorrect) {
        return sendError(res, constants.UNAUTHORIZED, "Invalid credentials");
      }
      const accessToken = await user.generateAccessToken();
      return sendSuccess(res, constants.OK, "User logged in successfully", {
        accessToken,
        updatePassword: false,
      });
    } else {
      const isTempPasswordCorrect = await user.isTempPasswordCorrect(password);
      if (!isTempPasswordCorrect) {
        return sendError(
          res,
          constants.UNAUTHORIZED,
          "Invalid temporary password"
        );
      }

      const accessToken = await user.generateAccessToken();
      return sendSuccess(
        res,
        constants.OK,
        "Temporary password accepted. Please change your password",
        { accessToken, updatePassword: true }
      );
    }
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const updatePassword = expressAsyncHandler(async (req, res) => {
  try {
    const { password } = req.body;
    const user = req.user;

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.tempPassword = "";
    user.status = "verified";
    await user.save();

    return sendSuccess(res, constants.OK, "Password updated successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const generateOTP = expressAsyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, constants.VALIDATION_ERROR, "Email is required");
    }

    const user = await User.findOne({ email }).select("email");

    if (!user) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Department not found with this email"
      );
    }

    const existingOTP = await OTP.findOne({ email });
    if (existingOTP) {
      await OTP.findByIdAndDelete(existingOTP._id);
    }

    const otp = generateOTPCode();
    const otpDoc = await OTP.create({ email, otp });

    const { message, messageHTML } = generateForgotPasswordOTPMessage(
      email,
      otp
    );

    await sendEmail(
      email,
      `Password Reset OTP - "${otp}"`,
      message,
      messageHTML
    );

    return sendSuccess(res, constants.OK, "OTP sent successfully", otpDoc);
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const verifyOTP = expressAsyncHandler(async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Email and OTP are required"
      );
    }

    const otpDoc = await OTP.findOne({ email });
    if (!otpDoc) {
      return sendError(
        res,
        constants.UNAUTHORIZED,
        "Your OTP has expired. Please request a new one"
      );
    }

    if (otpDoc.otp !== otp) {
      return sendError(res, constants.UNAUTHORIZED, "Invalid OTP");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Department not found with this email"
      );
    }

    const accessToken = await user.generateAccessToken();

    await OTP.findByIdAndDelete(otpDoc._id);
    return sendSuccess(res, constants.OK, "OTP verified successfully", {
      accessToken,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getUserProfile = expressAsyncHandler(async (req, res) => {
  try {
    return sendSuccess(
      res,
      constants.OK,
      "Department profile fetched successfully",
      req.user
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getDepartmentById = expressAsyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return sendError(res, constants.VALIDATION_ERROR, "User ID is required");
    }
    let user = await User.findById(userId).select("-password -tempPassword");

    if (req.moderator && !req.moderator.department.includes(user.department)) {
      return sendError(
        res,
        constants.UNAUTHORIZED,
        "You are not authorized to view this user"
      );
    }

    const allTables = await SchemaMeta.find({}).select("tableName");
    const tableNames = allTables.map((table) => table.tableName);

    user = await getDocumentCountOfDepartments(user, tableNames);

    return sendSuccess(
      res,
      constants.OK,
      "Department retrieved successfully",
      user
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getAllDepartments = expressAsyncHandler(async (req, res) => {
  try {
    let users = await User.find({}).select("-password -tempPassword");
    
    if (!users || users.length === 0) {
      return sendSuccess(res, constants.OK, "No departments found", []);
    }
    
    const allTables = await SchemaMeta.find({}).select("tableName");
    const tableNames = allTables.map((table) => table.tableName);

    const updatedUsers = await Promise.all(
      users.map(async (user) => await getDocumentCountOfDepartments(user, tableNames))
    );

    return sendSuccess(res, constants.OK, "Users retrieved successfully", updatedUsers);
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getAllDepartmentsByModerator = expressAsyncHandler(async (req, res) => {
  try {
    let users = await User.find({ department: { $in: req.moderator.department} }).select("-password -tempPassword");

    if (!users || users.length === 0) {
      return sendSuccess(res, constants.OK, "No departments found", []);
    }
    
    const allTables = await SchemaMeta.find({}).select("tableName");
    const tableNames = allTables.map((table) => table.tableName);

    const updatedUsers = await Promise.all(
      users.map(async (user) => await getDocumentCountOfDepartments(user, tableNames))
    );

    return sendSuccess(res, constants.OK, "Users retrieved successfully", updatedUsers);
  } catch (error) {
    return sendServerError(res, error);
  }
})

export const updateUserDetails = expressAsyncHandler(async (req, res) => {
  try {
    const { name, email, phone, department, college } = req.body;
    const userId = req.params.userId;
    if (!userId) {
      return sendError(res, constants.VALIDATION_ERROR, "User ID is required");
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        email,
        phone,
        department,
        college,
      },
      { new: true, validateBeforeSave: true }
    );
    return sendSuccess(
      res,
      constants.OK,
      "User updated successfully",
      updatedUser
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const deleteUser = expressAsyncHandler(async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return sendError(res, constants.VALIDATION_ERROR, "User ID is required");
    }
    const deletedUser = await User.findByIdAndDelete(userId);
    return sendSuccess(res, constants.OK, "User deleted successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
});
