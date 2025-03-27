import { Router } from "express";
import {
  createTimeline,
  getTimeline,
  checkDateInTimeline,
} from "../controllers/timeline.controller.js";
import { verifySuperAdmin, verifyLogin } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createTimeline").post(verifySuperAdmin, createTimeline);
router.route("/getTimeline").post(verifyLogin, getTimeline);
router.route("/checkDateInTimeline").post(verifyLogin, checkDateInTimeline);

export default router;
