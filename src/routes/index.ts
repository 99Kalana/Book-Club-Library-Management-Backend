
import { Router } from "express";
import authRouter from "./auth.routes";
import readerRouter from "./reader.routes";
import bookRouter from "./book.routes";
import lendingRouter from "./lending.routes";
import auditRouter from "./audit.routes";
import notificationRouter from "./notification.routes";


const rootRouter = Router();

rootRouter.use("/auth", authRouter);

rootRouter.use("/readers", readerRouter);

rootRouter.use("/books", bookRouter);

rootRouter.use("/lending", lendingRouter);

rootRouter.use("/audit-logs", auditRouter);

rootRouter.use("/notifications", notificationRouter);

export default rootRouter;
