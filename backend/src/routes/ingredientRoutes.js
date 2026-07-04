import { Router } from "express";
import { ingredientController } from "../controllers/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Gestão de ingredientes — funcionalidade exclusiva de staff (página Stock).
router.use(verifyToken, requireRole(1));

router.get("/", ingredientController.getAll);
router.get("/:id", ingredientController.getById);
router.post("/", ingredientController.create);
router.put("/:id", ingredientController.update);
router.delete("/:id", ingredientController.remove);

export default router;
