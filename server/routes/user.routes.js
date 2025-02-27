import { Router } from "express";
import {
  createUser,
  loginUser,
  updatePassword,
  getAllDepartments,
  updateUserDetails,
  deleteUser,
} from "../controllers/user.controller.js";
import {
  verifySuperAdmin,
  verifyUser,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(verifySuperAdmin, createUser);
router.route("/getAllDepartments").post(verifySuperAdmin, getAllDepartments);
router.route("/login").post(loginUser);
router.route("/updatePassword").post(verifyUser, updatePassword);
router
  .route("/updateUserDetails/:id")
  .post(verifySuperAdmin, updateUserDetails);
router.route("/deleteUser/:id").post(verifySuperAdmin, deleteUser);

export default router;
