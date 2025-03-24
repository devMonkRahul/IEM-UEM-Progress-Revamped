import { Router } from "express";
import {
  createModerator,
  loginModerator,
  updatePassword,
  getAllModerators,
  deleteModerator,
  updateModerator,
  profile,
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

export default router;
