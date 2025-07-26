
import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
    name: string;
    email: string;
    password?: string;
    role: 'librarian';
    createdAt: Date;
    updatedAt: Date;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
}

const userSchema = new mongoose.Schema<IUser>({
    name: {
        type: String,
        minlength: [2, "Name must be at least 2 characters"],
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        unique: [true, "User with this email already registered"],
        required: [true, "Email is required"],
        index: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Please fill a valid email format"],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
        type: String,
        enum: ['librarian'],
        default: 'librarian',
        required: true,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
}, {
    timestamps: true,
});

export const UserModel = mongoose.model<IUser>("User", userSchema);


