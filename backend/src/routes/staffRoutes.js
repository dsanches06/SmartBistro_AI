import { Router } from "express";
import * as staffController from "../controllers/staffController.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Gestão de staff — só acessível a STAFF autenticado.
router.use(verifyToken, requireRole(1));

router.get("/",              staffController.getAll);
router.post("/",             staffController.create);
router.get("/:userId/check", staffController.check);
router.get("/:userId",       staffController.getByUserId);
router.put("/:userId",       staffController.update);
router.delete("/:userId",    staffController.remove);

export default router;
