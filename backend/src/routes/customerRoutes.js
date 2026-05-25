import { Router } from "express";
import * as customerController from "../controllers/customerController.js";

const router = Router();

router.get("/", customerController.getAll);
router.get("/:id", customerController.getById);
router.post("/", customerController.create);
router.put("/:id", customerController.update);
router.delete("/:id", customerController.remove);
router.patch("/:id/active", customerController.toggleActive);

export default router;
