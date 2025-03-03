import { Router } from "express";
import { createDocument } from "../controllers/document.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createDocument").post(verifyUser, createDocument);

export default router;