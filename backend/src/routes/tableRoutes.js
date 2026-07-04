import { Router } from "express";
import { tableController, tableGroupController } from "../controllers/index.js";
import { checkTableExists } from "../middlewares/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

const staffOnly = [verifyToken, requireRole(1)];

router.get("/",  ...staffOnly, tableController.getAll);
router.post("/", ...staffOnly, tableController.create);

// Grupos de mesas — ANTES das rotas /:id para não capturar "groups" como id
router.post("/groups",             ...staffOnly, tableGroupController.create);
router.get("/groups/:groupId",     ...staffOnly, tableGroupController.getById);
router.delete("/groups/:groupId",  ...staffOnly, tableGroupController.dissolve);

router.get("/:id/details",    checkTableExists, ...staffOnly, tableController.getDetails);
router.get("/:id/reservation",checkTableExists, ...staffOnly, tableController.getReservation);
router.get("/:id",            checkTableExists, ...staffOnly, tableController.getById);
router.put("/:id",            checkTableExists, ...staffOnly, tableController.update);
// Sem auth de propósito — libertada também pelo pagamento via chat de convidados anónimos (ChatUI.jsx).
router.patch("/:id/status",   checkTableExists, tableController.updateStatus);
router.delete("/:id",         checkTableExists, ...staffOnly, tableController.remove);

export default router;
