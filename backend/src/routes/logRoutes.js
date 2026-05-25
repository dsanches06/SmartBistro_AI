import { Router } from "express";
import * as logController from "../controllers/logController.js";

const router = Router();

router.get("/", logController.getAll);
router.get("/order/:orderId", logController.getByOrderId);
router.get("/agent/:agentName", logController.getByAgent);
router.get("/:id", logController.getById);
router.post("/", logController.create);
router.delete("/order/:orderId", logController.removeByOrderId);
router.delete("/:id", logController.remove);

export default router;
