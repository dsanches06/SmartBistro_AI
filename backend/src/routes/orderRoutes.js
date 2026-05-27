import { Router } from "express";
import { orderController, orderPipelineController } from "../controllers/index.js";

const router = Router();

// ── Pipeline de 3 agentes (formulário → Maître → Chefe → Gerente → MySQL) ────
// IMPORTANTE: rota específica "/pipeline" ANTES de "/:id" para evitar conflito
router.post("/pipeline", orderPipelineController.processOrderPipeline);

// ── CRUD standard ─────────────────────────────────────────────────────────────
router.get("/", orderController.getAll);
router.get("/pending", orderController.getPending);
router.get("/customer/:customerId", orderController.getByCustomerId);
router.get("/:id", orderController.getById);
router.post("/", orderController.create);
router.put("/:id", orderController.update);
router.patch("/:id/status", orderController.updateStatus);
router.delete("/:id", orderController.remove);

export default router;
