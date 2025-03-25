import Moderator from "../models/moderator.model.js";
import OTP from "../models/otp.model.js";
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

export const createModerator = expressAsyncHandler(async (req, res) => {
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

    if (
      !Array.isArray(department) ||
      department.length === 0 ||
      !Array.isArray(college) ||
      college.length === 0
    ) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Department and college must be an non-empty array"
      );
    }

    if (await Moderator.findOne({ email })) {
      return sendError(res, constants.CONFLICT, "Moderator already exists");
    }

    // Hash tempPassword before storing
    const salt = await bcrypt.genSalt(10);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);

    const moderator = await Moderator.create({
      name,
      email,
      phone,
      department,
      college,
      tempPassword: hashedTempPassword,
    });

    const { message, messageHTML } = generatePasswordMessage(
      email,
      tempPassword,
      "Moderator"
    );

    await sendEmail(email, "Account Credentials", message, messageHTML);
    return sendSuccess(
      res,
      constants.OK,
      "Moderator created successfully. Check your email for login credentials",
      moderator
    );
  } catch (error) {
    console.error("Error creating moderator: ", error);
    return sendServerError(res, error);
  }
});

export const loginModerator = expressAsyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Please fill all the fields"
      );
    }

    const moderator = await Moderator.findOne({ email });
    if (!moderator) {
      return sendError(res, constants.VALIDATION_ERROR, "Moderator not found");
    }
    if (moderator.tempPassword === "") {
      const isPasswordCorrect = await moderator.isPasswordCorrect(password);
      if (!isPasswordCorrect) {
        return sendError(res, constants.UNAUTHORIZED, "Invalid credentials");
      }
      const accessToken = await moderator.generateAccessToken();
      return sendSuccess(
        res,
        constants.OK,
        "Moderator logged in successfully",
        {
          accessToken,
          updatePassword: false,
        }
      );
    } else {
      const isTempPasswordCorrect = await moderator.isTempPasswordCorrect(
        password
      );
      if (!isTempPasswordCorrect) {
        return sendError(
          res,
          constants.UNAUTHORIZED,
          "Invalid temporary password"
        );
      }

      const accessToken = await moderator.generateAccessToken();
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
    const moderator = req.moderator;

    const salt = await bcrypt.genSalt(10);
    moderator.password = await bcrypt.hash(password, salt);
    moderator.tempPassword = "";
    moderator.status = "verified";
    await moderator.save();

    return sendSuccess(res, constants.OK, "Password updated successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getAllModerators = expressAsyncHandler(async (req, res) => {
  try {
    const moderators = await Moderator.find({}).select(
      "-password -tempPassword"
    );

    if (!moderators || moderators.length === 0) {
      return sendSuccess(res, constants.OK, "No moderators found", []);
    }

    return sendSuccess(
      res,
      constants.OK,
      "Moderators retrieved successfully",
      moderators
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const deleteModerator = expressAsyncHandler(async (req, res) => {
  try {
    const { moderatorId } = req.params;
    if (!moderatorId) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Moderator ID is required"
      );
    }

    const moderator = await Moderator.findById(moderatorId);
    if (!moderator) {
      return sendError(res, constants.NOT_FOUND, "Moderator not found");
    }

    await Moderator.findByIdAndDelete(moderatorId);
    sendSuccess(res, constants.OK, "Moderator deleted successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const updateModerator = expressAsyncHandler(async (req, res) => {
  try {
    const { moderatorId } = req.params;
    const { name, email, phone, department, college } = req.body;

    if (!moderatorId) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Moderator ID is required"
      );
    }

    const moderator = await Moderator.findById(moderatorId);
    if (!moderator) {
      return sendError(res, constants.NOT_FOUND, "Moderator not found");
    }

    const updatedModerator = await Moderator.findByIdAndUpdate(
      moderatorId,
      { name, email, phone, department, college },
      { new: true, runValidators: true }
    );

    sendSuccess(
      res,
      constants.OK,
      "Moderator updated successfully",
      updatedModerator
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const profile = expressAsyncHandler(async (req, res) => {
  try {
    return sendSuccess(
      res,
      constants.OK,
      "Moderator profile retrieved successfully",
      req.moderator
    );
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

    const moderator = await Moderator.findOne({ email }).select(
      "email name department college"
    );

    if (!moderator) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Moderator not found with this email"
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

    const moderator = await Moderator.findOne({ email });

    if (!moderator) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Moderator not found with this email"
      );
    }

    const accessToken = await moderator.generateAccessToken();

    await OTP.findByIdAndDelete(otpDoc._id);
    return sendSuccess(res, constants.OK, "OTP verified successfully", {
      accessToken,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});