import { Router } from "express";
import { itemController } from "../controllers/index.js";

const router = Router();

router.get("/", itemController.getAll);
router.get("/active", itemController.getActive);
router.get("/:id", itemController.getById);
router.post("/", itemController.create);
router.put("/:id", itemController.update);
router.patch("/:id/active", itemController.toggleActive);
router.delete("/:id", itemController.remove);

export default router;
