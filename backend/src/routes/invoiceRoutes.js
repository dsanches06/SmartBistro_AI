import { Router } from "express";
import { invoiceController } from "../controllers/index.js";
import { checkInvoiceExists } from "../middlewares/index.js";

const router = Router();

router.get("/",                   invoiceController.getAll);
router.get("/order/:orderId",     invoiceController.getByOrderId);
router.post("/",                  invoiceController.create);

router.get("/:id",   checkInvoiceExists, invoiceController.getById);
router.put("/:id",   checkInvoiceExists, invoiceController.update);
router.delete("/:id",checkInvoiceExists, invoiceController.remove);

export default router;
