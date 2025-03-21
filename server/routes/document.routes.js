import { Router } from "express";
import { createDocument, getAllDocumentsByUser, getAllDocumentsByModerator } from "../controllers/document.controller.js";
import { verifyUser, verifyModerator } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createDocument").post(verifyUser, createDocument);
router.route("/getAllDocumentsByUser").post(verifyUser, getAllDocumentsByUser);
router.route("/getAllDocumentsByModerator").post(verifyModerator, getAllDocumentsByModerator);

export default router;