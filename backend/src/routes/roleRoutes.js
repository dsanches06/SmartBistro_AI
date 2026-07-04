import { Router } from "express";
import { roleController } from "../controllers/index.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(verifyToken);

router.get("/", roleController.getAll);
router.get("/:id", roleController.getById);

export default router;
