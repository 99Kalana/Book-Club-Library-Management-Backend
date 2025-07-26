
import { Router } from "express";
import {
    createBook,
    getAllBooks,
    getBookById,
    updateBook,
    deleteBook,
} from "../controllers/book.controller";
import { authenticateToken } from "../middlewares/authenticateToken";

const bookRouter = Router();

bookRouter.use(authenticateToken);

bookRouter.post("/", createBook);
bookRouter.get("/", getAllBooks);
bookRouter.get("/:id", getBookById);
bookRouter.put("/:id", updateBook);
bookRouter.delete("/:id", deleteBook);

export default bookRouter;
