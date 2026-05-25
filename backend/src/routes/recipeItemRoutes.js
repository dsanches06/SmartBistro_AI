import { Router } from "express";
import * as recipeItemController from "../controllers/recipeItemController.js";

const router = Router();

router.get("/", recipeItemController.getAll);
router.get("/item/:itemId", recipeItemController.getByItemId);
router.get("/ingredient/:ingredientId", recipeItemController.getByIngredientId);
router.get("/:id", recipeItemController.getById);
router.post("/", recipeItemController.create);
router.put("/:id", recipeItemController.update);
router.delete("/item/:itemId", recipeItemController.removeByItemId);
router.delete("/:id", recipeItemController.remove);

export default router;
