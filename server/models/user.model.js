import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../constants.js";

const userSchema = new Schema(
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
    password: {
      type: String,
      trim: true,
      default: "",
    },
    profileImage: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/9131/9131529.png",
      trim: true,
    },
    department: [
      {
        type: String,
        required: [true, "Department is required"],
        trim: true,
      },
    ],
    tempPassword: {
      type: String,
    },
    totalSubmission: {
      type: Number,
      default: 0,
    },
    pendingCount: {
      type: Number,
      default: 0,
    },
    acceptedCount: {
      type: Number,
      default: 0,
    },
    rejectedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
    },
    college: {
      type: String,
      required: [true, "College is required"],
      trim: true,
      enum: ["IEMN", "IEMS", "UEMJ"],
    },
  },
  { timestamps: true }
);

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.isTempPasswordCorrect = async function (tempPassword) {
  return await bcrypt.compare(tempPassword, this.tempPassword);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email },
    config.accessTokenSecret,
    {
      expiresIn: config.accessTokenExpiry || "1d",
    }
  );
};

const User = mongoose.model("User", userSchema);
export default User;
