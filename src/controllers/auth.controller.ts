
import { Request, Response, NextFunction } from "express";
import { UserModel, IUser } from "../models/User";
import bcrypt from "bcrypt";
import { ApiError }  from "../errors/ApiError";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { createAuditLog } from "./audit.controller";
import mongoose from "mongoose";
import crypto from 'crypto';
import { sendEmail } from '../services/emailService';

const createAccessToken = (userId: string): string => {
    return jwt.sign(
        { userId },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: '15m' }
    );
};

const createRefreshToken = (userId: string): string => {
    return jwt.sign(
        { userId },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: '7d' }
    );
};


export const signUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;

        const existingUser: IUser | null = await UserModel.findOne({ email });
        if (existingUser) {
            throw new ApiError(409, "User with this email already exists.");
        }

        const SALT_ROUNDS = 10;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = new UserModel({
            name,
            email,
            password: hashedPassword,
            role: 'librarian',
        });
        const createdUser: IUser = await user.save();

        const userWithoutPassword = {
            _id: (createdUser._id as mongoose.Types.ObjectId).toString(),
            name: createdUser.name,
            email: createdUser.email,
            role: createdUser.role,
        };

        await createAuditLog(
            "USER_SIGNUP",
            createdUser.name,
            "User",
            (createdUser._id as mongoose.Types.ObjectId).toString(),
            { email: createdUser.email }
        );

        res.status(201).json({ user: userWithoutPassword, message: "Librarian account created successfully." });
    } catch (error: any) {
        next(error);
    }
};


export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users: IUser[] = await UserModel.find().select("-password");
        res.status(200).json(users);
    } catch (error: any) {
        next(error);
    }
};


export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, password } = req.body;

        const user: IUser | null = await UserModel.findOne({ name }).select('+password');
        if (!user) {
            throw new ApiError(404, "Invalid credentials.");
        }
        const foundUser: IUser = user;

        const isMatch = await bcrypt.compare(password, foundUser.password!);
        if (!isMatch) {
            throw new ApiError(401, "Invalid credentials.");
        }

        const accessToken = createAccessToken((foundUser._id as mongoose.Types.ObjectId).toString());
        const refreshToken = createRefreshToken((foundUser._id as mongoose.Types.ObjectId).toString());

        const isProd = process.env.NODE_ENV === "production";
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProd,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/api/auth/refresh-token",
        });

        const userWithoutPassword = {
            _id: (foundUser._id as mongoose.Types.ObjectId).toString(),
            name: foundUser.name,
            email: foundUser.email,
            role: foundUser.role,
        };

        await createAuditLog(
            "USER_LOGIN",
            foundUser.name,
            "User",
            (foundUser._id as mongoose.Types.ObjectId).toString()
        );

        res.status(200).json({ user: userWithoutPassword, token: accessToken, message: "Logged in successfully." });
    } catch (error: any) {
        next(error);
    }
};


export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.refreshToken;

        if (!token) {
            throw new ApiError(401, "Refresh token missing.");
        }

        jwt.verify(
            token,
            process.env.REFRESH_TOKEN_SECRET!,
            async (err: Error | null, decoded: string | jwt.JwtPayload | undefined) => {
                if (err) {
                    if (err instanceof TokenExpiredError) {
                        return next(new ApiError(401, "Refresh token expired. Please log in again."));
                    } else if (err instanceof JsonWebTokenError) {
                        return next(new ApiError(401, "Invalid refresh token."));
                    } else {
                        return next(new ApiError(401, "Refresh token verification error."));
                    }
                }

                if (!decoded || typeof decoded === "string" || !('userId' in decoded)) {
                    return next(new ApiError(401, "Refresh token payload error."));
                }

                const userId = decoded.userId as string;

                const user: IUser | null = await UserModel.findById(userId);

                if (!user) {
                    return next(new ApiError(401, "User not found."));
                }

                const foundUser: IUser = user;

                const newAccessToken = createAccessToken((foundUser._id as mongoose.Types.ObjectId).toString());

                res.status(200).json({ accessToken: newAccessToken, message: "Access token refreshed." });
            }
        );
    } catch (error: any) {
        next(error);
    }
};


export const logout = (req: Request, res: Response, next: NextFunction) => {
    try {
        const isProd = process.env.NODE_ENV === "production";

        res.cookie("refreshToken", "", {
            httpOnly: true,
            secure: isProd,
            expires: new Date(0),
            path: "/api/auth/refresh-token",
        });

        createAuditLog(
            "USER_LOGOUT",
            req.userId || "Unknown User",
            "User",
            req.userId ? (req.userId as unknown as mongoose.Types.ObjectId).toString() : undefined
        );

        res.status(200).json({ message: "Logout successful." });
    } catch (err: any) {
        next(err);
    }
};


export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.userId) {
            throw new ApiError(401, 'Not authenticated');
        }

        const user: IUser | null = await UserModel.findById(req.userId).select("-password");

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        res.status(200).json(user.toObject({ getters: true, virtuals: false, transform: (doc, ret: any) => { delete ret.password; return ret; } }));
    } catch (error: any) {
        next(new ApiError(500, 'Failed to fetch user profile'));
    }
};


export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.userId) {
            return next(new ApiError(401, 'Not authenticated'));
        }

        const { name, email } = req.body;

        if (!name && !email) {
            return next(new ApiError(400, 'No fields provided for update'));
        }

        const user: IUser | null = await UserModel.findById(req.userId);
        if (!user) {
            return next(new ApiError(404, 'User not found'));
        }

        const currentUserId = (user._id as mongoose.Types.ObjectId).toString();


        if (name && user.name !== name) {
            user.name = name;
        }
        if (email && user.email !== email) {

            const existingUserWithEmail: IUser | null = await UserModel.findOne({ email });
            if (existingUserWithEmail && (existingUserWithEmail._id as mongoose.Types.ObjectId).toString() !== currentUserId) {
                return next(new ApiError(409, 'Email already in use by another account'));
            }
            user.email = email;
        }

        await user.save();

        res.status(200).json(user.toObject({ getters: true, virtuals: false, transform: (doc, ret: any) => { delete ret.password; return ret; } }));
    } catch (error: any) {
        next(new ApiError(500, 'Failed to update profile'));
    }
};


export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.userId) {
            return next(new ApiError(401, 'Not authenticated'));
        }

        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return next(new ApiError(400, 'All password fields are required'));
        }
        if (newPassword !== confirmNewPassword) {
            return next(new ApiError(400, 'New passwords do not match'));
        }
        if (newPassword.length < 6) {
            return next(new ApiError(400, 'New password must be at least 6 characters'));
        }


        const user: IUser | null = await UserModel.findById(req.userId).select('+password');
        if (!user) {
            return next(new ApiError(404, 'User not found'));
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password!);
        if (!isMatch) {
            return next(new ApiError(401, 'Invalid current password'));
        }


        const SALT_ROUNDS = 10;
        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.save();

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error: any) {
        next(new ApiError(500, 'Failed to change password'));
    }
};


export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new ApiError(400, "Email is required.");
        }

        const user: IUser | null = await UserModel.findOne({ email });


        if (!user) {
            return res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." });
        }


        const resetToken = crypto.randomBytes(32).toString('hex');


        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');


        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = tokenExpires;
        await user.save({ validateBeforeSave: false });


        const resetURL = `${process.env.CLIENT_ORIGIN}/reset-password/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password for your account.\n\nPlease go to the following link to reset your password:\n\n${resetURL}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset Request for Book Club Library',
                text: message,
            });

            res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." });
        } catch (emailError: any) {

            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });
            console.error("Error sending password reset email:", emailError);
            return next(new ApiError(500, "There was an error sending the password reset email. Please try again later."));
        }

        await createAuditLog(
            "PASSWORD_RESET_REQUEST",
            user.name,
            "User",
            (user._id as mongoose.Types.ObjectId).toString(),
            { email: user.email }
        );

    } catch (error: any) {
        next(error);
    }
};


export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params;
        const { newPassword, confirmNewPassword } = req.body;

        if (!newPassword || !confirmNewPassword) {
            throw new ApiError(400, "New password and confirmation are required.");
        }
        if (newPassword !== confirmNewPassword) {
            throw new ApiError(400, "New passwords do not match.");
        }
        if (newPassword.length < 6) {
            throw new ApiError(400, "New password must be at least 6 characters.");
        }


        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');


        const user: IUser | null = await UserModel.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            throw new ApiError(400, "Password reset token is invalid or has expired.");
        }


        const SALT_ROUNDS = 10;
        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);


        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        await createAuditLog(
            "PASSWORD_RESET_SUCCESS",
            user.name,
            "User",
            (user._id as mongoose.Types.ObjectId).toString(),
            { email: user.email }
        );

        res.status(200).json({ message: "Password has been reset successfully. You can now log in with your new password." });

    } catch (error: any) {
        next(error);
    }
};
