import { Router } from "express";
import {
  createModerator,
  loginModerator,
  updatePassword,
  getAllModerators
} from "../controllers/moderator.controller.js";
import {
  verifySuperAdmin,
  verifyModerator,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(verifySuperAdmin, createModerator);
router.route("/getAllModerators").post(verifySuperAdmin, getAllModerators);
router.route("/login").post(loginModerator);
router.route("/updatePassword").post(verifyModerator, updatePassword);

export default router;
