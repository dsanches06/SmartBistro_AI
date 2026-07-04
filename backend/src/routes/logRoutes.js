import { Router } from "express";
import { logController } from "../controllers/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Logs de sistema/agentes — não usados pelo frontend, só para auditoria staff.
router.use(verifyToken, requireRole(1));

router.get("/", logController.getAll);
router.get("/order/:orderId", logController.getByOrderId);
router.get("/agent/:agentName", logController.getByAgent);
router.get("/:id", logController.getById);
router.post("/", logController.create);
router.delete("/order/:orderId", logController.removeByOrderId);
router.delete("/:id", logController.remove);

export default router;
