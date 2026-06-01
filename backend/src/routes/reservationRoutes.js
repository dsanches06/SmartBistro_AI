import { Router } from "express";
import { reservationController } from "../controllers/index.js";
import { checkReservationExists } from "../middlewares/index.js";

const router = Router();

router.get("/customer/:customerId", reservationController.getByCustomer);
router.get("/",                     reservationController.getAll);
router.post("/",                    reservationController.create);

router.get("/:id",          checkReservationExists, reservationController.getById);
router.patch("/:id/status", checkReservationExists, reservationController.updateStatus);
router.patch("/:id/cancel", checkReservationExists, reservationController.cancel);
router.delete("/:id",       checkReservationExists, reservationController.remove);

export default router;
