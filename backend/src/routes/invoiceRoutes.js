import { Router } from "express";
import { invoiceController } from "../controllers/index.js";
import { checkInvoiceExists } from "../middlewares/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Cliente e staff partilham a maior parte destas rotas (faturas próprias vs. gestão total).
router.use(verifyToken);

router.get("/",                   requireRole(1), invoiceController.getAll);
router.get("/order/:orderId",     invoiceController.getByOrderId);
router.post("/",                  invoiceController.create);

router.get("/:id",   checkInvoiceExists, invoiceController.getById);
router.put("/:id",   checkInvoiceExists, invoiceController.update);
router.delete("/:id",checkInvoiceExists, requireRole(1), invoiceController.remove);

export default router;
