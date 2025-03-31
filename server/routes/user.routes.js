import { Router } from "express";
import {
  createUser,
  loginUser,
  updatePassword,
  getAllDepartments,
  getAllDepartmentsByModerator,
  updateUserDetails,
  deleteUser,
  getUserProfile,
  getDepartmentById,
  generateOTP,
  verifyOTP,
} from "../controllers/user.controller.js";
import {
  verifySuperAdmin,
  verifyUser,
  verifyModerator,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(verifySuperAdmin, createUser);
router.route("/profile").post(verifyUser, getUserProfile);
router.route("/getAllDepartments").post(verifySuperAdmin, getAllDepartments);
router.route("/getAllDepartmentsByUser").post(verifyUser, getAllDepartments);
router.route("/getAllDepartmentsByModerator").post(verifyModerator, getAllDepartmentsByModerator);
router.route("/getDepartmentByIdByModerator/:userId").post(verifyModerator, getDepartmentById);
router.route("/getDepartmentByIdBySuperAdmin/:userId").post(verifySuperAdmin, getDepartmentById);
router.route("/login").post(loginUser);
router.route("/updatePassword").post(verifyUser, updatePassword);
router
  .route("/updateUserDetails/:userId")
  .post(verifySuperAdmin, updateUserDetails);
router.route("/deleteUser/:userId").post(verifySuperAdmin, deleteUser);

router.route("/generateOTP").post(generateOTP);
router.route("/verifyOTP").post(verifyOTP);

export default router;
