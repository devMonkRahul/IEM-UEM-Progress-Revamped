import { createSuperAdmin, loginSuperAdmin, getSuperAdminProfile } from "../controllers/superAdmin.controller.js";
import { Router } from "express";
import { verifySuperAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(createSuperAdmin);
router.route("/login").post(loginSuperAdmin);
router.route("/profile").post(verifySuperAdmin, getSuperAdminProfile);

export default router;