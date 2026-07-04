import { Router } from "express";
import { reservationController } from "../controllers/index.js";
import { checkReservationExists } from "../middlewares/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Gestão de reservas — feita pelo staff na página de Mesas (clientes reservam via chatbot).
router.use(verifyToken, requireRole(1));

router.get("/user/:userId", reservationController.getByUserId);
router.get("/",                     reservationController.getAll);
router.post("/",                    reservationController.create);

router.get("/:id",          checkReservationExists, reservationController.getById);
router.patch("/:id/status", checkReservationExists, reservationController.updateStatus);
router.patch("/:id/cancel", checkReservationExists, reservationController.cancel);
router.delete("/:id",       checkReservationExists, reservationController.remove);

export default router;
