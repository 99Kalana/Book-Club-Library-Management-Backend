
import mongoose from "mongoose";

export interface IReader extends mongoose.Document {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    registeredDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const readerSchema = new mongoose.Schema<IReader>({
    name: {
        type: String,
        required: [true, "Reader name is required"],
        minlength: [2, "Reader name must be at least 2 characters"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: [true, "Reader with this email already exists"],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Please enter a valid email format"],
    },
    phone: {
        type: String,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    registeredDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
}, {
    timestamps: true,
});

export const ReaderModel = mongoose.model<IReader>("Reader", readerSchema);
