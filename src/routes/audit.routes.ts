
import { Router } from "express";
import { getAllAuditLogs } from "../controllers/audit.controller";
import { authenticateToken } from "../middlewares/authenticateToken";

const auditRouter = Router();

auditRouter.use(authenticateToken);

auditRouter.get("/", getAllAuditLogs);

export default auditRouter;
