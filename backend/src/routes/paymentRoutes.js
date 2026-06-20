import { Router } from "express";
import { paymentController } from "../controllers/index.js";
import { checkPaymentExists } from "../middlewares/index.js";

const router = Router();

router.get("/",                       paymentController.getAll);
router.get("/invoice/:invoiceId",     paymentController.getByInvoiceId);
router.get("/user/:userId",           paymentController.getByUserId);
router.post("/",                      paymentController.create);

router.get("/:id",          checkPaymentExists, paymentController.getById);
router.put("/:id",          checkPaymentExists, paymentController.update);
router.patch("/:id/process",checkPaymentExists, paymentController.process);
router.patch("/:id/fail",   checkPaymentExists, paymentController.fail);
router.delete("/:id",       checkPaymentExists, paymentController.remove);

export default router;
