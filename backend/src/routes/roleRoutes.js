import { Router } from "express";
import { roleController } from "../controllers/index.js";

const router = Router();

router.get("/", roleController.getAll);
router.get("/:id", roleController.getById);

export default router;
