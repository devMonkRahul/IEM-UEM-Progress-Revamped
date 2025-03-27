import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import initializeDatabase from "./server/config/db.config.js";
import { config } from "./server/constants.js";

const app = express();

// Create logs directory if it doesn't exist
const logDirectory = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

// Create a write stream (append mode) for logging requests
const accessLogStream = fs.createWriteStream(path.join(logDirectory, 'access.log'), { flags: 'a' });

// Use Morgan to log requests to the file and console
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

initializeDatabase()
    .then(() => {
        app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
        app.on("error", (error) => {
            console.error("Error on the server: ", error);
            throw error;
        });
    })
    .catch((error) => console.log("MongoDB Connection Failed: ", error));

app.get("/", (req, res) => {
    return res.status(200).json({ 
        success: true,
        message: "I am IEM_UEM Progress working fine.👍🏻" 
    });
});

// Route to fetch last 100 lines of logs
app.get("/logs", (req, res) => {
    const logFilePath = path.join(logDirectory, 'access.log');

    // Read last 100 lines from the log file
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error reading log file" });
        }

        const lines = data.trim().split("\n");
        const last100Lines = lines.slice(-100).join("\n");

        res.setHeader('Content-Type', 'text/plain');
        res.send(last100Lines);
    });
});

// Import the routes
import superAdminRoutes from "./server/routes/superAdmin.routes.js";
import userRoutes from "./server/routes/user.routes.js";
import moderatorRoutes from "./server/routes/moderator.routes.js"
import dynamicSchemaRoutes from "./server/routes/dynamicSchema.routes.js";
import documentRoutes from "./server/routes/document.routes.js";
import timelineRoutes from "./server/routes/timeline.routes.js";

// Use the routes
app.use("/api/v1/superAdmin", superAdminRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/moderator", moderatorRoutes);
app.use("/api/v1/dynamicSchema", dynamicSchemaRoutes);
app.use("/api/v1/document", documentRoutes);
app.use("/api/v1/timeline", timelineRoutes);