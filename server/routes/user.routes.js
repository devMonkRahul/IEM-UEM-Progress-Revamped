import { Router } from "express";
import {
  createUser,
  loginUser,
  updatePassword,
} from "../controllers/user.controller.js";
import {
  verifySuperAdmin,
  verifyUser,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(verifySuperAdmin, createUser);
router.route("/login").post(loginUser);
router.route("/updatePassword").post(verifyUser, updatePassword);

export default router;
