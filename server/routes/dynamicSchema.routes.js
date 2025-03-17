import { Router } from "express";
import { createSchema, getAllSchemas, getSchemaById, deleteSchema, updateSchema } from "../controllers/dynamicSchema.controller.js";
import { verifySuperAdmin, verifyLogin } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createDocument").post(verifySuperAdmin, createSchema);
router.route("/getAllDocumentSchema").post(verifyLogin, getAllSchemas);
router.route("/getDocumentSchemaById/:schemaId").post(verifyLogin, getSchemaById);
router.route("/updateDocumentSchema/:schemaId").post(verifySuperAdmin, updateSchema);
router.route("/deleteDocumentSchema/:schemaId").post(verifySuperAdmin, deleteSchema);

export default router;