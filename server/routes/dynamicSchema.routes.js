import { Router } from "express";
import { createSchema, getAllSchemas, getSchemaById, deleteSchema, updateSchema } from "../controllers/dynamicSchema.controller.js";
import { verifySuperAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createDocument").post(verifySuperAdmin, createSchema);
router.route("/getAllDocuments").post(verifySuperAdmin, getAllSchemas);
router.route("/getDocument/:schemaId").post(verifySuperAdmin, getSchemaById);
router.route("/updateDocument/:schemaId").post(verifySuperAdmin, updateSchema);
router.route("/deleteDocument/:schemaId").post(verifySuperAdmin, deleteSchema);

export default router;