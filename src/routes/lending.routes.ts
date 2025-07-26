
import { Router } from "express";
import {
    lendBook,
    returnBook,
    getAllLendingTransactions,
    getOverdueTransactions,
    getLendingHistoryByBook,
    getLendingHistoryByReader,
} from "../controllers/lending.controller";
import { authenticateToken } from "../middlewares/authenticateToken";

const lendingRouter = Router();

lendingRouter.use(authenticateToken);

lendingRouter.post("/", lendBook);
lendingRouter.put("/:id/return", returnBook);
lendingRouter.get("/", getAllLendingTransactions);
lendingRouter.get("/overdue", getOverdueTransactions);

lendingRouter.get("/book/:bookId", getLendingHistoryByBook);
lendingRouter.get("/reader/:readerId", getLendingHistoryByReader);

export default lendingRouter;
