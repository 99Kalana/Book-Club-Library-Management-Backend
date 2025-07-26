
import { Request, Response, NextFunction } from "express";
import { ReaderModel, IReader } from "../models/Reader";
import { ApiError } from "../errors/ApiError";
import { createAuditLog } from "./audit.controller";
import { UserModel, IUser } from "../models/User";
import mongoose from "mongoose";


export const createReader = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const readerInstance = new ReaderModel(req.body);
        const reader: IReader = await readerInstance.save();

        const performingUser: IUser | null = await UserModel.findById(req.userId);
        const performedByName = performingUser ? performingUser.name : "Unknown Librarian";


        await createAuditLog(
            "READER_ADDED",
            performedByName,
            "Reader",
            (reader._id as mongoose.Types.ObjectId).toString(),
            { newReader: reader.toObject() }
        );

        res.status(201).json(reader);
    } catch (error: any) {
        next(error);
    }
};


export const getAllReaders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const readers: IReader[] = await ReaderModel.find();
        res.status(200).json(readers);
    } catch (error: any) {
        next(error);
    }
};


export const getReaderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reader: IReader | null = await ReaderModel.findById(req.params.id);
        if (!reader) {
            throw new ApiError(404, "Reader not found!");
        }
        res.status(200).json(reader);
    } catch (error: any) {
        next(error);
    }
};


export const updateReader = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const oldReader: IReader | null = await ReaderModel.findById(req.params.id);
        if (!oldReader) {
            throw new ApiError(404, "Reader not found!");
        }

        const updatedReader: IReader | null = await ReaderModel.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );
        if (!updatedReader) {
            throw new ApiError(404, "Reader not found after update attempt!");
        }

        const performingUser: IUser | null = await UserModel.findById(req.userId);
        const performedByName = performingUser ? performingUser.name : "Unknown Librarian";


        await createAuditLog(
            "READER_UPDATED",
            performedByName,
            "Reader",
            (updatedReader._id as mongoose.Types.ObjectId).toString(),
            {
                oldData: oldReader.toObject(),
                newData: updatedReader.toObject(),
            }
        );

        res.status(200).json(updatedReader);
    } catch (error: any) {
        next(error);
    }
};


export const deleteReader = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deletedReader: IReader | null = await ReaderModel.findByIdAndDelete(req.params.id);
        if (!deletedReader) {
            throw new ApiError(404, "Reader not found!");
        }

        const performingUser: IUser | null = await UserModel.findById(req.userId);
        const performedByName = performingUser ? performingUser.name : "Unknown Librarian";


        await createAuditLog(
            "READER_DELETED",
            performedByName,
            "Reader",
            (deletedReader._id as mongoose.Types.ObjectId).toString(),
            { deletedReader: deletedReader.toObject() }
        );

        res.status(200).json({ message: "Reader deleted successfully!" });
    } catch (error: any) {
        next(error);
    }
};
