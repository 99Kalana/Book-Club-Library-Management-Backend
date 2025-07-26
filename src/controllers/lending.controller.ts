
import { Request, Response, NextFunction } from "express";
import { LendingTransactionModel, ILendingTransaction } from "../models/LendingTransaction";
import { BookModel, IBook } from "../models/Book";
import { ReaderModel, IReader } from "../models/Reader";
import { ApiError } from "../errors/ApiError";
import { createAuditLog } from "./audit.controller";
import { UserModel, IUser } from "../models/User";
import mongoose from "mongoose";


const calculateDueDate = (): Date => {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setMinutes(now.getMinutes() + 1);
    return dueDate;
};

/*const calculateDueDate = (): Date => {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 14); // 14 days from borrow date
    return dueDate;
};*/


export const lendBook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { bookId, readerId } = req.body;

        const book: IBook | null = await BookModel.findById(bookId);
        if (!book) {
            throw new ApiError(404, "Book not found.");
        }
        const reader: IReader | null = await ReaderModel.findById(readerId);
        if (!reader) {
            throw new ApiError(404, "Reader not found.");
        }

        if (book.availableCopies <= 0) {
            throw new ApiError(400, "Book is currently not available for lending.");
        }

        const borrowDate = new Date();
        const dueDate = calculateDueDate();

        const transactionInstance = new LendingTransactionModel({
            book: bookId,
            reader: readerId,
            borrowDate,
            dueDate,
            status: 'borrowed',
        });
        const transaction: ILendingTransaction = await transactionInstance.save();

        book.availableCopies -= 1;
        await book.save();


        const populatedTransaction: ILendingTransaction | null = await LendingTransactionModel.findById(transaction._id)
            .populate('book')
            .populate('reader');

        if (!populatedTransaction) {
            throw new ApiError(500, "Failed to retrieve populated transaction after lending.");
        }

        const performingUser: IUser | null = await UserModel.findById(req.userId);
        const performedByName = performingUser ? performingUser.name : "Unknown Librarian";


        await createAuditLog(
            "BOOK_LENT",
            performedByName,
            "LendingTransaction",
            (populatedTransaction._id as mongoose.Types.ObjectId).toString(),
            {
                bookTitle: (populatedTransaction.book as IBook)?.title,
                readerName: (populatedTransaction.reader as IReader)?.name,
                borrowDate: populatedTransaction.borrowDate,
                dueDate: populatedTransaction.dueDate,
            }
        );

        res.status(201).json(populatedTransaction);
    } catch (error: any) {
        next(error);
    }
};


export const returnBook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { returnDate, fineAmount } = req.body;

        const transaction: ILendingTransaction | null = await LendingTransactionModel.findById(id).populate('book').populate('reader');
        if (!transaction) {
            throw new ApiError(404, "Lending transaction not found.");
        }

        if (transaction.status === 'returned') {
            throw new ApiError(400, "Book has already been returned.");
        }

        const oldStatus = transaction.status;

        transaction.returnDate = returnDate ? new Date(returnDate) : new Date();
        transaction.status = 'returned';
        if (fineAmount !== undefined) {
            transaction.fineAmount = fineAmount;
        }

        await transaction.save();

        const book = transaction.book as IBook;
        book.availableCopies += 1;
        await book.save();

        const performingUser: IUser | null = await UserModel.findById(req.userId);
        const performedByName = performingUser ? performingUser.name : "Unknown Librarian";


        await createAuditLog(
            "BOOK_RETURNED",
            performedByName,
            "LendingTransaction",
            (transaction._id as mongoose.Types.ObjectId).toString(),
            {
                bookTitle: book.title,
                readerName: (transaction.reader as IReader).name,
                oldStatus: oldStatus,
                newStatus: transaction.status,
                fineAmount: transaction.fineAmount,
                returnDate: transaction.returnDate,
            }
        );

        res.status(200).json(transaction);
    } catch (error: any) {
        next(error);
    }
};


export const getAllLendingTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const transactions: ILendingTransaction[] = await LendingTransactionModel.find()
            .populate('book')
            .populate('reader')
            .sort({ borrowDate: -1 });

        res.status(200).json(transactions);
    } catch (error: any) {
        next(error);
    }
};


export const getOverdueTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const now = new Date();

        const overdueTransactions: ILendingTransaction[] = await LendingTransactionModel.find({
            status: { $in: ['borrowed', 'overdue'] },
            dueDate: { $lt: now },
            returnDate: { $eq: null }
        })
            .populate('book')
            .populate('reader')
            .sort({ dueDate: 1 });

        const transactionsWithDaysOverdue = overdueTransactions.map(transaction => {
            const due = new Date(transaction.dueDate);
            const diffTime = now.getTime() - due.getTime();
            const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { ...transaction.toObject(), daysOverdue };
        });

        res.status(200).json(transactionsWithDaysOverdue);
    } catch (error: any) {
        next(error);
    }
};

export const getLendingHistoryByBook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { bookId } = req.params;
        const transactions: ILendingTransaction[] = await LendingTransactionModel.find({ book: bookId })
            .populate('book')
            .populate('reader')
            .sort({ borrowDate: -1 });
        res.status(200).json(transactions);
    } catch (error: any) {
        next(error);
    }
};

export const getLendingHistoryByReader = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { readerId } = req.params;
        const transactions: ILendingTransaction[] = await LendingTransactionModel.find({ reader: readerId })
            .populate('book')
            .populate('reader')
            .sort({ borrowDate: -1 });
        res.status(200).json(transactions);
    } catch (error: any) {
        next(error);
    }
};
