import { Router } from "express";
import { orderItemController } from "../controllers/index.js";

const router = Router();

router.get("/", orderItemController.getAll);
router.get("/order/:orderId", orderItemController.getByOrderId);
router.get("/:id", orderItemController.getById);
router.post("/", orderItemController.create);
router.post("/bulk", orderItemController.createBulk);
router.patch("/:id", orderItemController.updateQuantity);
router.delete("/order/:orderId", orderItemController.removeByOrderId);
router.delete("/:id", orderItemController.remove);

export default router;
