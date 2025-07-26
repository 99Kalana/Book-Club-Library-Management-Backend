
import mongoose, { Schema } from "mongoose";
import { IBook } from "./Book";
import { IReader } from "./Reader";

export interface ILendingTransaction extends mongoose.Document {
    book: Schema.Types.ObjectId | IBook;
    reader: Schema.Types.ObjectId | IReader;
    borrowDate: Date;
    dueDate: Date;
    returnDate?: Date;
    status: 'borrowed' | 'returned' | 'overdue';
    fineAmount?: number;
    createdAt: Date;
    updatedAt: Date;
}

const lendingTransactionSchema = new mongoose.Schema<ILendingTransaction>({
    book: {
        type: Schema.Types.ObjectId,
        ref: 'Book',
        required: [true, "Book ID is required for lending transaction"],
    },
    reader: {
        type: Schema.Types.ObjectId,
        ref: 'Reader',
        required: [true, "Reader ID is required for lending transaction"],
    },
    borrowDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
    dueDate: {
        type: Date,
        required: [true, "Due date is required"],
    },
    returnDate: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['borrowed', 'returned', 'overdue'],
        default: 'borrowed',
        required: true,
    },
    fineAmount: {
        type: Number,
        default: 0,
        min: [0, "Fine amount cannot be negative"],
    },
}, {
    timestamps: true,
});

export const LendingTransactionModel = mongoose.model<ILendingTransaction>("LendingTransaction", lendingTransactionSchema);
