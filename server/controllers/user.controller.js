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
    const { email, phone, department } = req.body;
    const tempPassword = generateRandomPassword();

    if (await User.findOne({ email })) {
      return sendError(res, constants.CONFLICT, "User already exists");
    }

    // Hash tempPassword before storing
    const salt = await bcrypt.genSalt(10);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);

    const user = await User.create({
      email,
      phone,
      department,
      tempPassword: hashedTempPassword,
    });

    const { message, messageHTML } = generatePasswordMessage(
      email,
      tempPassword,
      "User"
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
    await user.save();

    return sendSuccess(res, constants.OK, "Password updated successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
});
