
import mongoose, { Schema } from "mongoose";


export interface IAuditLog extends mongoose.Document {
    action: string;
    entityType?: 'Book' | 'Reader' | 'LendingTransaction' | 'User';
    entityId?: Schema.Types.ObjectId;
    performedBy: string;
    timestamp: Date;
    details?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const auditLogSchema = new mongoose.Schema<IAuditLog>({
    action: {
        type: String,
        required: [true, "Audit action is required"],
        trim: true,
    },
    entityType: {
        type: String,
        enum: ['Book', 'Reader', 'LendingTransaction', 'User'],
        required: false,
    },
    entityId: {
        type: Schema.Types.ObjectId,
        required: false,
    },
    performedBy: {
        type: String,
        required: [true, "Performer is required for audit log"],
        trim: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
    },
    details: {
        type: Schema.Types.Mixed,
        required: false,
    },
}, {
    timestamps: true,
});

export const AuditLogModel = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
