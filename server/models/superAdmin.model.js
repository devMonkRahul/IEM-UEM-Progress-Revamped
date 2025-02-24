import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../constants.js";

const superAdminSchema = new Schema(
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
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      match: [/^\d{10}$/, "Please enter a valid phone number"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      trim: true,
      minlength: [8, "Password must be at least 8 characters long"],
    },
    profileImage: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/9131/9131529.png",
      trim: true,
    },
  },
  { timestamps: true }
);

// Hash the password before saving the user
superAdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Check if the provided password matches the hashed password
superAdminSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

superAdminSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email },
    config.accessTokenSecret,
    {
      expiresIn: config.accessTokenExpiry || "1d",
    }
  );
};

const SuperAdmin = mongoose.model("SuperAdmin", superAdminSchema);

export default SuperAdmin;
