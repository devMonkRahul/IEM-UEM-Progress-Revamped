import mongoose from "mongoose";
import { config } from "../constants.js";

const connectDB = async () => {
    try {
        await mongoose.connect(`${config.uri}`);
        console.log("MongoDB connection SUCCESS");
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;