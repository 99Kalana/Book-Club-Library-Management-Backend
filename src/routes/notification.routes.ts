
import { Router } from "express";
import { sendOverdueNotifications } from "../controllers/notification.controller";
import { authenticateToken } from "../middlewares/authenticateToken";

const notificationRouter = Router();

notificationRouter.use(authenticateToken);

notificationRouter.post("/send-overdue-emails", sendOverdueNotifications);

export default notificationRouter;
