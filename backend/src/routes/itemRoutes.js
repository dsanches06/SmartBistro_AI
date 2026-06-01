import { Router } from "express";
import { itemController } from "../controllers/index.js";
import { checkItemExists } from "../middlewares/index.js";

const router = Router();

router.get("/",       itemController.getAll);
router.get("/active", itemController.getActive);
router.post("/",      itemController.create);

router.get("/:id",          checkItemExists, itemController.getById);
router.put("/:id",          checkItemExists, itemController.update);
router.patch("/:id/active", checkItemExists, itemController.toggleActive);
router.delete("/:id",       checkItemExists, itemController.remove);

export default router;
