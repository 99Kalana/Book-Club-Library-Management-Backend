
import { Router } from "express";
import {
    createReader,
    getAllReaders,
    getReaderById,
    updateReader,
    deleteReader,
} from "../controllers/reader.controller";
import { authenticateToken } from "../middlewares/authenticateToken";

const readerRouter = Router();

readerRouter.use(authenticateToken);

readerRouter.post("/", createReader);
readerRouter.get("/", getAllReaders);
readerRouter.get("/:id", getReaderById);
readerRouter.put("/:id", updateReader);
readerRouter.delete("/:id", deleteReader);

export default readerRouter;
