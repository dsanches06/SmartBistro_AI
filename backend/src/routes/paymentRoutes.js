import { Router } from "express";
import { paymentController } from "../controllers/index.js";
import { checkPaymentExists } from "../middlewares/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// POST "/" fica público de propósito — usado também por convidados anónimos a
// pagar Takeaway via chat (ChatUI.jsx / PaymentModal.jsx, userId pode ser null).
router.post("/",                      paymentController.create);

router.get("/",                       verifyToken, requireRole(1), paymentController.getAll);
router.get("/invoice/:invoiceId",     verifyToken, paymentController.getByInvoiceId);
router.get("/user/:userId",           verifyToken, paymentController.getByUserId);

router.get("/:id",          checkPaymentExists, verifyToken, requireRole(1), paymentController.getById);
router.put("/:id",          checkPaymentExists, verifyToken, requireRole(1), paymentController.update);
router.patch("/:id/process",checkPaymentExists, verifyToken, requireRole(1), paymentController.process);
router.patch("/:id/fail",   checkPaymentExists, verifyToken, requireRole(1), paymentController.fail);
router.delete("/:id",       checkPaymentExists, verifyToken, requireRole(1), paymentController.remove);

export default router;
