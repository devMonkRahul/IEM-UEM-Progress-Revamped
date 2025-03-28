import { Router } from "express";
import {
  createDocument,
  getAllDocumentsByUser,
  getAllDocumentsByModerator,
  getDocumentById,
  verifyDocumentByModerator,
  verifyDocumentBySuperAdmin,
  finalSubmission,
  bulkUpload,
  getAllDocumentsBySuperAdmin,
} from "../controllers/document.controller.js";
import {
  verifyUser,
  verifyModerator,
  verifyLogin,
  verifySuperAdmin,
} from "../middlewares/auth.middleware.js";
import { uploadExcel, uploadPdf } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/createDocument").post(verifyUser, uploadPdf.single("file"), createDocument);
router.route("/getAllDocumentsByUser").post(verifyUser, getAllDocumentsByUser);
router.route("/getAllDocumentsBySuperAdmin").post(verifySuperAdmin, getAllDocumentsBySuperAdmin);
router
  .route("/getAllDocumentsByModerator")
  .post(verifyModerator, getAllDocumentsByModerator);
router.route("/getDocumentById").post(verifyLogin, getDocumentById);
router
  .route("/verifyDocumentByModerator")
  .post(verifyModerator, verifyDocumentByModerator);
router
  .route("/verifyDocumentBySuperAdmin")
  .post(verifySuperAdmin, verifyDocumentBySuperAdmin);

router.route("/bulkUpload").post(verifyUser, uploadExcel.single("file"), bulkUpload);

router.route("/finalSubmission").post(verifyUser, finalSubmission);

export default router;
