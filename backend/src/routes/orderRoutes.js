import { Router } from "express";
import * as orderController from "../controllers/orderController.js";

const router = Router();

router.get("/", orderController.getAll);
router.get("/pending", orderController.getPending);
router.get("/customer/:customerId", orderController.getByCustomerId);
router.get("/:id", orderController.getById);
router.post("/", orderController.create);
router.put("/:id", orderController.update);
router.patch("/:id/status", orderController.updateStatus);
router.delete("/:id", orderController.remove);

export default router;
