
import { Request, Response, NextFunction } from "express";
import { AuditLogModel, IAuditLog } from "../models/AuditLog";


export const getAllAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const logs = await AuditLogModel.find().sort({ timestamp: -1 });
        res.status(200).json(logs);
    } catch (error: any) {
        next(error);
    }
};


export const createAuditLog = async (
    action: string,
    performedBy: string,
    entityType?: IAuditLog['entityType'],
    entityId?: string,
    details?: Record<string, any>
) => {
    try {
        const log = new AuditLogModel({
            action,
            entityType,
            entityId,
            performedBy,
            details,
            timestamp: new Date(),
        });
        await log.save();
    } catch (error) {
        console.error("Error creating audit log:", error);
    }
};
