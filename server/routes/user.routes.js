import { Router } from "express";
import {
  createUser,
  loginUser,
  updatePassword,
  getAllDepartments,
  updateUserDetails,
  deleteUser,
  getUserProfile,
} from "../controllers/user.controller.js";
import {
  verifySuperAdmin,
  verifyUser,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(verifySuperAdmin, createUser);
router.route("/profile").post(verifyUser, getUserProfile);
router.route("/getAllDepartments").post(verifySuperAdmin, getAllDepartments);
router.route("/getAllDepartmentsByUser").post(verifyUser, getAllDepartments);
router.route("/login").post(loginUser);
router.route("/updatePassword").post(verifyUser, updatePassword);
router
  .route("/updateUserDetails/:userId")
  .post(verifySuperAdmin, updateUserDetails);
router.route("/deleteUser/:userId").post(verifySuperAdmin, deleteUser);

export default router;
