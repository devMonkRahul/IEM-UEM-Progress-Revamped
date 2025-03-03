import User from "../models/user.model.js";
import expressAsyncHandler from "express-async-handler";
import { constants } from "../constants.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";
import bcrypt from "bcrypt";
import { generateRandomPassword } from "../utils/generateRandomPassword.utils.js";
import { sendEmail, generatePasswordMessage } from "../utils/mailer.utils.js";

export const createUser = expressAsyncHandler(async (req, res) => {
  try {
    const { name, email, phone, department, college } = req.body;
    const tempPassword = generateRandomPassword();

    if (await User.findOne({ email })) {
      return sendError(res, constants.CONFLICT, "User already exists");
    }

    if (!Array.isArray(department) || department.length === 0) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Department must be an array",
      );
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
      `User, Department: ${department[0]}`,
    );

    await sendEmail(email, "Account Credentials", message, messageHTML);
    return sendSuccess(
      res,
      constants.OK,
      "User created successfully. Check your email for login credentials",
      user,
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
        "Please fill all the fields",
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
          "Invalid temporary password",
        );
      }

      const accessToken = await user.generateAccessToken();
      return sendSuccess(
        res,
        constants.OK,
        "Temporary password accepted. Please change your password",
        { accessToken, updatePassword: true },
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

export const getAllDepartments = expressAsyncHandler(async (req, res) => {
  try {
    const users = await User.find({}).select("-password -tempPassword");

    if (!users || users.length === 0) {
      return sendSuccess(res, constants.OK, "No departments found", []);
    }
    return sendSuccess(res, constants.OK, "User retrieved successfully", users);
  } catch (error) {
    return sendServerError(res, error);
  }
});

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
      { new: true, validateBeforeSave: true },
    );
    return sendSuccess(
      res,
      constants.OK,
      "User updated successfully",
      updatedUser,
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
