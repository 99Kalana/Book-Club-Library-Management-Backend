
import { Router } from "express";
import {
    signUp,
    login,
    refreshToken,
    logout,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
} from "../controllers/auth.controller";
import { authenticateToken } from "../middlewares/authenticateToken";

const authRouter = Router();

// Public routes
authRouter.post("/signup", signUp);
authRouter.post("/login", login);
authRouter.post("/refresh-token", refreshToken);
authRouter.post("/logout", logout);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password/:token", resetPassword);

// Protected routes (requires authentication)
authRouter.get("/me", authenticateToken, getMe);
authRouter.put("/me", authenticateToken, updateProfile);
authRouter.put("/change-password", authenticateToken, changePassword);

export default authRouter;

