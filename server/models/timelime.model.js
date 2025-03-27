import mongoose from "mongoose";

// Date format: yyyy/mm/dd
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const timelineScheam = new mongoose.Schema({
  startDate: { type: String, required: true, match: dateRegex },
  endDate: { type: String, required: true, match: dateRegex },
}, {timestamps: true});

const Timeline = mongoose.model("Timeline", timelineScheam);
export default Timeline;