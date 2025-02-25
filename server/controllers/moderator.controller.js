import Moderator from "../models/moderator.model.js";
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

export const createModerator = expressAsyncHandler(async (req, res) => {
  try {
    const { name, email, phone, department, college } = req.body;
    const tempPassword = generateRandomPassword();

    if (!Array.isArray(department) || department.length === 0) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Department must be an array"
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
    moderator.status = "verified"
    await moderator.save();

    return sendSuccess(res, constants.OK, "Password updated successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const getModerator = expressAsyncHandler(async (req, res) => {
  try {
      const moderator= await Moderator.find()
    console.log(moderator)
    return sendSuccess(res, constants.OK, "Moderator retrieved successfully", moderator);
  } catch (error) {
    return sendServerError(res, error);
  }
});
