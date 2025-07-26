
import mongoose from "mongoose";


export interface IBook extends mongoose.Document {
    title: string;
    author: string;
    isbn: string;
    genre?: string;
    publicationYear?: number;
    publisher?: string;
    availableCopies: number;
    totalCopies: number;
    createdAt: Date;
    updatedAt: Date;
}

const bookSchema = new mongoose.Schema<IBook>({
    title: {
        type: String,
        required: [true, "Book title is required"],
        minlength: [2, "Book title must be at least 2 characters"],
        trim: true,
    },
    author: {
        type: String,
        required: [true, "Author name is required"],
        minlength: [2, "Author name must be at least 2 characters"],
        trim: true,
    },
    isbn: {
        type: String,
        required: [true, "ISBN is required"],
        unique: [true, "Book with this ISBN already exists"],
        trim: true,
        match: [/^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/, "Please enter a valid ISBN (10 or 13 digits)"],
    },
    genre: {
        type: String,
        trim: true,
    },
    publicationYear: {
        type: Number,
        min: [1000, "Publication year must be valid"],
        max: [new Date().getFullYear(), "Publication year cannot be in the future"],
    },
    publisher: {
        type: String,
        trim: true,
    },
    totalCopies: {
        type: Number,
        required: [true, "Total copies is required"],
        min: [0, "Total copies cannot be negative"],
    },
    availableCopies: {
        type: Number,
        required: [true, "Available copies is required"],
        min: [0, "Available copies cannot be negative"],
    },
}, {
    timestamps: true,
});


bookSchema.pre("save", function (next) {
    if (this.isNew && this.availableCopies === undefined) {
        this.availableCopies = this.totalCopies;
    }
    next();
});

export const BookModel = mongoose.model<IBook>("Book", bookSchema);
