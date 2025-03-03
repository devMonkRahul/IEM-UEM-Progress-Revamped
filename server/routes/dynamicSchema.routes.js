import { Router } from "express";
import { createSchema } from "../controllers/dynamicSchema.controller.js";
import { verifySuperAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createDocument").post(verifySuperAdmin, createSchema);


export default router;