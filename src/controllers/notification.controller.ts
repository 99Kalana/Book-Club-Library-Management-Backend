
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError";
import { LendingTransactionModel, ILendingTransaction } from "../models/LendingTransaction";
import { IReader } from "../models/Reader";
import { IBook } from "../models/Book";
import { createAuditLog } from "./audit.controller";
import { UserModel, IUser } from "../models/User";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();



const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});




const calculateDaysOverdue = (dueDate: Date): number => {
    const due = new Date(dueDate);
    const now = new Date();
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};


export const sendOverdueNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { readerIds } = req.body;



        if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_FROM_NAME) {
            throw new ApiError(500, "Email services environment variables are not fully configured. Please check .env file.");
        }

        if (!readerIds || !Array.isArray(readerIds) || readerIds.length === 0) {
            throw new ApiError(400, "No reader IDs provided for notifications.");
        }


        const overdueTransactions: ILendingTransaction[] = await LendingTransactionModel.find({
            reader: { $in: readerIds },
            status: { $in: ['borrowed', 'overdue'] },
            dueDate: { $lt: new Date() },
            returnDate: { $eq: null }
        })
            .populate('book')
            .populate('reader');

        if (overdueTransactions.length === 0) {
            return res.status(200).json({ message: "No overdue books found for the specified readers." });
        }


        const readersToNotify: { [readerId: string]: { reader: IReader, books: IBook[] } } = {};
        overdueTransactions.forEach(transaction => {
            const reader = transaction.reader as IReader; // Assert type for populated reader
            const book = transaction.book as IBook; // Assert type for populated book
            if (!readersToNotify[(reader._id as mongoose.Types.ObjectId).toString()]) { // Explicit cast
                readersToNotify[(reader._id as mongoose.Types.ObjectId).toString()] = { reader, books: [] }; // Explicit cast
            }
            readersToNotify[(reader._id as mongoose.Types.ObjectId).toString()].books.push(book); // Explicit cast
        });

        let sentCount = 0;
        const errors: { readerId: string, error: string }[] = [];


        for (const readerId in readersToNotify) {
            const { reader, books } = readersToNotify[readerId];
            const overdueBooksDetails = books.map(transactionBook => {
                const transactionForBook = overdueTransactions.find(t =>
                    ((t.book as IBook)?._id as mongoose.Types.ObjectId)?.toString() === (transactionBook._id as mongoose.Types.ObjectId)?.toString() &&
                    ((t.reader as IReader)?._id as mongoose.Types.ObjectId)?.toString() === (reader._id as mongoose.Types.ObjectId)?.toString()
                );
                const dueDate = transactionForBook ? new Date(transactionForBook.dueDate).toLocaleDateString() : 'N/A';
                const daysOverdue = transactionForBook ? calculateDaysOverdue(transactionForBook.dueDate) : 0;
                return `- "${transactionBook.title}" by ${transactionBook.author} (Due: ${dueDate}, Overdue by ${daysOverdue} days)`;
            }).join('\n');

            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
                to: reader.email,
                subject: "Overdue Book Reminder from Book Club Library",
                html: `
          <p>Dear ${reader.name},</p>
          <p>This is a friendly reminder that you have one or more books overdue at the Book Club Library.</p>
          <p>Please return the following book(s) as soon as possible:</p>
          <pre>${overdueBooksDetails}</pre>
          <p>Please return these items to the library at your earliest convenience to avoid further fines.</p>
          <p>Thank you for your cooperation.</p>
          <p>Sincerely,</p>
          <p>The Book Club Library Team</p>
        `,
            };

            try {
                await transporter.sendMail(mailOptions);
                sentCount++;
            } catch (mailError: any) {
                console.error(`Failed to send email to ${reader.email}:`, mailError);
                errors.push({ readerId: (reader._id as mongoose.Types.ObjectId).toString(), error: mailError.message });
            }
        }

        const performingUser: IUser | null = await UserModel.findById(req.userId);
        const performedByName = performingUser ? performingUser.name : "Unknown Librarian";


        await createAuditLog(
            "OVERDUE_NOTIFICATIONS_SENT",
            performedByName,
            "LendingTransaction",
            undefined,
            {
                notifiedReaderIds: readerIds,
                sentCount: sentCount,
                failedCount: errors.length,
                errors: errors.length > 0 ? errors : undefined,
            }
        );

        if (errors.length > 0) {
            throw new ApiError(500, `Successfully sent ${sentCount} notifications, but ${errors.length} failed. See server logs for details.`);
        } else {
            res.status(200).json({ message: `Successfully sent ${sentCount} overdue notifications.`, sentCount });
        }
    } catch (error: any) {
        next(error);
    }
};
