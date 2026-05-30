import { Router } from "express";
import { tableController } from "../controllers/index.js";

const router = Router();

router.get("/", tableController.getAll);
router.get("/:id/details", tableController.getDetails);
router.get("/:id/reservation", tableController.getReservation);
router.get("/:id", tableController.getById);
router.post("/", tableController.create);
router.put("/:id", tableController.update);
router.patch("/:id/status", tableController.updateStatus);
router.delete("/:id", tableController.remove);

export default router;
