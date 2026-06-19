import { Router } from "express";
import * as userController from "../controllers/userController.js";
import { getUserById } from "../services/userService.js";
import { createExistsMiddleware } from "../middlewares/createExistsMiddleware.js";

const router = Router();
const checkUserExists = createExistsMiddleware(getUserById, "Utilizador", "user");

router.get("/",  userController.getAll);
router.post("/", userController.create);

router.get("/:id",    checkUserExists, userController.getById);
router.put("/:id",    checkUserExists, userController.update);
router.delete("/:id", checkUserExists, userController.remove);
router.patch("/:id/active", checkUserExists, userController.toggleActive);

export default router;
