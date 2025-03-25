import { Router } from "express";
import {
  createModerator,
  loginModerator,
  updatePassword,
  getAllModerators,
  deleteModerator,
  updateModerator,
  profile,
  generateOTP,
  verifyOTP,
} from "../controllers/moderator.controller.js";
import {
  verifySuperAdmin,
  verifyModerator,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(verifySuperAdmin, createModerator);
router.route("/profile").post(verifyModerator, profile);
router.route("/getAllModerators").post(verifySuperAdmin, getAllModerators);
router.route("/login").post(loginModerator);
router.route("/updatePassword").post(verifyModerator, updatePassword);
router.route("/deleteModerator/:moderatorId").post(verifySuperAdmin, deleteModerator);
router.route("/updateModerator/:moderatorId").post(verifySuperAdmin, updateModerator);

router.route("/generateOTP").post(generateOTP);
router.route("/verifyOTP").post(verifyOTP);

export default router;
