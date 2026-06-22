import { Router } from "express";
import { tableController, tableGroupController } from "../controllers/index.js";
import { checkTableExists } from "../middlewares/index.js";

const router = Router();

router.get("/",  tableController.getAll);
router.post("/", tableController.create);

// Grupos de mesas — ANTES das rotas /:id para não capturar "groups" como id
router.post("/groups",             tableGroupController.create);
router.get("/groups/:groupId",     tableGroupController.getById);
router.delete("/groups/:groupId",  tableGroupController.dissolve);

router.get("/:id/details",    checkTableExists, tableController.getDetails);
router.get("/:id/reservation",checkTableExists, tableController.getReservation);
router.get("/:id",            checkTableExists, tableController.getById);
router.put("/:id",            checkTableExists, tableController.update);
router.patch("/:id/status",   checkTableExists, tableController.updateStatus);
router.delete("/:id",         checkTableExists, tableController.remove);

export default router;
