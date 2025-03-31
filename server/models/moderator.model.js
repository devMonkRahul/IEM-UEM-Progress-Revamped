import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../constants.js";

const moderatorSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        "Please enter a valid email address", // Validates proper email format
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      match: [/^\d{10}$/, "Please enter a valid phone number"],
      trim: true,
    },
    profileImage: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/9131/9131529.png",
      trim: true,
    },
    department: {
      type: [String],
      required: [true, "Department is required"],
      trim: true,
    },
    college: [
      {
        type: String,
        required: [true, "College is required"],
        enum: ["IEMN", "IEMS", "UEMJ"],
        trim: true,
      },
    ],
    password: {
      type: String,
      trim: true,
    },
    tempPassword: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "verified"],
      default: "pending",
    },
    goAsPerModerator: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

moderatorSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

moderatorSchema.methods.isTempPasswordCorrect = async function (tempPassword) {
  return await bcrypt.compare(tempPassword, this.tempPassword);
};

moderatorSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email, role: "moderator" },
    config.accessTokenSecret,
    {
      expiresIn: config.accessTokenExpiry || "1d",
    }
  );
};

const Moderator = mongoose.model("Moderator", moderatorSchema);
export default Moderator;
