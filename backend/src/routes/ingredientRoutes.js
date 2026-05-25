import { Router } from "express";
import * as ingredientController from "../controllers/ingredientController.js";

const router = Router();

router.get("/", ingredientController.getAll);
router.get("/:id", ingredientController.getById);
router.post("/", ingredientController.create);
router.put("/:id", ingredientController.update);
router.delete("/:id", ingredientController.remove);

export default router;
