
import { Request, Response, NextFunction } from "express";
import { BookModel, IBook } from "../models/Book";
import { ApiError } from "../errors/ApiError";
import { createAuditLog } from "./audit.controller";
import { UserModel, IUser } from "../models/User";
import mongoose from "mongoose";


export const createBook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { totalCopies, ...bookData } = req.body;

        const newBookInstance = new BookModel({
            ...bookData,
            totalCopies,
            availableCopies: totalCopies,
        });

        const newBook: IBook = await newBookInstance.save();

        const performingUser: IUser | null = await UserModel.findById(req.userId);
        const performedByName = performingUser ? performingUser.name : "Unknown Librarian";


        await createAuditLog(
            "BOOK_ADDED",
            performedByName,
            "Book",
            (newBook._id as mongoose.Types.ObjectId).toString(),
            { newBook: newBook.toObject() }
        );

        res.status(201).json(newBook);
    } catch (error: any) {
        next(error);
    }
};


export const getAllBooks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const books: IBook[] = await BookModel.find();
        res.status(200).json(books);
    } catch (error: any) {
        next(error);
    }
};


export const getBookById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const book: IBook | null = await BookModel.findById(req.params.id);
        if (!book) {
            throw new ApiError(404, "Book not found!");
        }
        res.status(200).json(book);
    } catch (error: any) {
        next(error);
    }
};


export const updateBook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const oldBook: IBook | null = await BookModel.findById(req.params.id);
        if (!oldBook) {
            throw new ApiError(404, "Book not found!");
        }

        const { totalCopies, ...updateData } = req.body;

        const updatedBook: IBook | null = await BookModel.findByIdAndUpdate(
            req.params.id,
            { ...updateData, totalCopies },
            {
                new: true,
                runValidators: true,
            }
        );
        if (!updatedBook) {
            throw new ApiError(404, "Book not found after update attempt!");
        }

        const performingUser: IUser | null = await UserModel.findById(req.userId);
        const performedByName = performingUser ? performingUser.name : "Unknown Librarian";


        await createAuditLog(
            "BOOK_UPDATED",
            performedByName,
            "Book",
            (updatedBook._id as mongoose.Types.ObjectId).toString(),
            {
                oldData: oldBook.toObject(),
                newData: updatedBook.toObject(),
            }
        );

        res.status(200).json(updatedBook);
    } catch (error: any) {
        next(error);
    }
};


export const deleteBook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deletedBook: IBook | null = await BookModel.findByIdAndDelete(req.params.id);
        if (!deletedBook) {
            throw new ApiError(404, "Book not found!");
        }

        const performingUser: IUser | null = await UserModel.findById(req.userId);
        const performedByName = performingUser ? performingUser.name : "Unknown Librarian";


        await createAuditLog(
            "BOOK_DELETED",
            performedByName,
            "Book",
            (deletedBook._id as mongoose.Types.ObjectId).toString(),
            { deletedBook: deletedBook.toObject() }
        );

        res.status(200).json({ message: "Book deleted successfully!" });
    } catch (error: any) {
        next(error);
    }
};
