import { Router } from "express";
import { stockController } from "../controllers/index.js";

const router = Router();

router.get("/", stockController.getAll);
router.get("/ingredient/:ingredientId", stockController.getByIngredientId);
router.get("/:id", stockController.getById);
router.post("/", stockController.create);
router.put("/:id", stockController.update);
router.patch("/ingredient/:ingredientId/adjust", stockController.adjustQuantity);
router.delete("/:id", stockController.remove);

export default router;
