import { Router } from "express";
import {
  createTimeline,
  getTimeline,
} from "../controllers/timeline.controller.js";
import { verifySuperAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createTimeline").post(verifySuperAdmin, createTimeline);
router.route("/getTimeline").get(getTimeline);

export default router;
