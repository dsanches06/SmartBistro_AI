import { Router } from "express";
import * as paymentController from "../controllers/paymentController.js";

const router = Router();

router.get("/", paymentController.getAll);
router.get("/invoice/:invoiceId", paymentController.getByInvoiceId);
router.get("/customer/:customerId", paymentController.getByCustomerId);
router.get("/:id", paymentController.getById);
router.post("/", paymentController.create);
router.put("/:id", paymentController.update);
router.patch("/:id/process", paymentController.process);
router.patch("/:id/fail", paymentController.fail);
router.delete("/:id", paymentController.remove);

export default router;
