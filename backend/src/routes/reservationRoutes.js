import { Router } from "express";
import { reservationController } from "../controllers/index.js";

const router = Router();

// Rotas específicas antes de /:id para evitar conflitos de params
router.get("/customer/:customerId", reservationController.getByCustomer);

router.get("/",    reservationController.getAll);
router.get("/:id", reservationController.getById);
router.post("/",   reservationController.create);
router.patch("/:id/status", reservationController.updateStatus);
router.patch("/:id/cancel", reservationController.cancel);
router.delete("/:id", reservationController.remove);

export default router;
