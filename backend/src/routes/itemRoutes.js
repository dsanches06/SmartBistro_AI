import { Router } from "express";
import { itemController } from "../controllers/index.js";
import { checkItemExists } from "../middlewares/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();
const staffOnly = [verifyToken, requireRole(1)];

// Menu público — usado pelo cardápio, inclusive por visitantes não autenticados.
router.get("/",       itemController.getAll);
router.get("/active", itemController.getActive);

// Gestão do menu (MenuPage) — exclusiva de staff.
router.post("/",      ...staffOnly, itemController.create);
router.get("/:id",          checkItemExists, ...staffOnly, itemController.getById);
router.put("/:id",          checkItemExists, ...staffOnly, itemController.update);
router.patch("/:id/active", checkItemExists, ...staffOnly, itemController.toggleActive);
router.delete("/:id",       checkItemExists, ...staffOnly, itemController.remove);

export default router;
