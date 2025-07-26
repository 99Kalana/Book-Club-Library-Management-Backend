
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";


declare global {
    namespace Express {
        interface Request {
            userId?: string;
            user?: { _id: string; role: string; name: string; email: string };
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            throw new ApiError(403, "Access token not found.");
        }

        jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET!,
            (err, decoded) => {
                if (err) {
                    if (err instanceof TokenExpiredError) {
                        throw new ApiError(403, "Access token expired!");
                    } else if (err instanceof JsonWebTokenError) {
                        throw new ApiError(403, "Invalid access token.");
                    } else {
                        throw new ApiError(403, "Error verifying access token.");
                    }
                }


                if (!decoded || typeof decoded === "string" || !('userId' in decoded)) {
                    throw new ApiError(500, "Access token payload error.");
                }


                req.userId = decoded.userId as string;

                next();
            }
        );
    } catch (error) {
        next(error);
    }
};
