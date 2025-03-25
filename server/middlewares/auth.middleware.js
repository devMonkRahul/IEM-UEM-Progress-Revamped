import SuperAdmin from "../models/superAdmin.model.js";
import expressAsyncHandler from "express-async-handler";
import { sendServerError, sendUnauthorized } from "../utils/response.utils.js";
import jwt from "jsonwebtoken";
import { config } from "../constants.js";
import User from "../models/user.model.js";
import Moderator from "../models/moderator.model.js";

export const verifySuperAdmin = expressAsyncHandler(async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return sendUnauthorized(res);
    }

    let decoded;

    try {
      decoded = jwt.verify(token, config.accessTokenSecret);
    } catch (error) {
      return sendUnauthorized(res);
    }

    const superAdmin = await SuperAdmin.findById(decoded?._id).select(
      "-password"
    );

    if (!superAdmin) {
      return sendUnauthorized(res);
    }

    req.superAdmin = superAdmin;
    next();
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const verifyUser = expressAsyncHandler(async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return sendUnauthorized(res);
    }

    let decoded;

    try {
      decoded = jwt.verify(token, config.accessTokenSecret);
    } catch (error) {
      return sendUnauthorized(res);
    }

    const user = await User.findById(decoded?._id).select("-password");

    if (!user) {
      return sendUnauthorized(res);
    }

    req.user = user;
    next();
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const verifyModerator = expressAsyncHandler(async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return sendUnauthorized(res);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.accessTokenSecret);
    } catch (error) {
      return sendUnauthorized(res);
    }
    const moderator = await Moderator.findById(decoded?._id).select(
      "-password"
    );

    if (!moderator) {
      return sendUnauthorized(res);
    }

    req.moderator = moderator;
    next();
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const verifyLogin = expressAsyncHandler(async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return sendUnauthorized(res);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.accessTokenSecret);
    } catch (error) {
      return sendUnauthorized(res)
    }

    if (!decoded) {
      return sendUnauthorized(res);
    }

    if (decoded?.role === "user") {
      const user = await User.findById(decoded?._id).select("-password");
      if (!user) {
        return sendUnauthorized(res);
      }

      req.user = user;
      next();
    } else if (decoded?.role === "moderator") {
      const moderator = await Moderator.findById(decoded?._id).select(
        "-password"
      );
      if (!moderator) {
        return sendUnauthorized(res);
      }

      req.moderator = moderator;
      next();
    } else {
      const superAdmin = await SuperAdmin.findById(decoded?._id).select(
        "-password"
      );
      if (!superAdmin) {
        return sendUnauthorized(res);
      }

      req.superAdmin = superAdmin;
      next();
    }
  } catch (error) {
    return sendServerError(res, error);
  }
});