import Timeline from "../models/timelime.model.js";
import expressAsyncHandler from "express-async-handler";
import { constants } from "../constants.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";

// Create a new Timeline
export const createTimeline = expressAsyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Please fill all the fields"
      );
    }

    const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Dates must be in YYYY-MM-DD format"
      );
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "end date must be after start date"
      );
    }

    let timeline = await Timeline.findOne();

    if (timeline) {
      timeline.set({ startDate, endDate });
    } else {
      timeline = new Timeline({
        startDate,
        endDate,
      });
    }

    await timeline.save();

    return sendSuccess(
      res,
      constants.OK,
      "Timeline created successfully",
      timeline
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

// Get the Timeline
export const getTimeline = expressAsyncHandler(async (req, res) => {
  try {
    const timeline = await Timeline.findOne();

    if (!timeline) {
      return sendError(res, constants.NO_CONTENT, "Timeline not found");
    }

    return sendSuccess(
      res,
      constants.OK,
      "Timeline fetched successfully",
      timeline
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

export const checkDateInTimeline = expressAsyncHandler(async (req, res) => {
  try {
    const date = new Date().toISOString().split("T")[0];

    const timeline = await Timeline.findOne();

    if (!timeline) {
      return sendError(res, constants.NO_CONTENT, "Timeline not found");
    }

    if (new Date(date) < new Date(timeline.startDate)) {
      return sendError(res, constants.VALIDATION_ERROR, "Date is before timeline start date");
    }

    if (new Date(date) > new Date(timeline.endDate)) {
      return sendError(res, constants.VALIDATION_ERROR, "Date is after timeline end date");
    }

    return sendSuccess(res, constants.OK, "Date is in timeline");
  } catch (error) {
    return sendServerError(res, error);
  }
});