// models/TransactionHistory.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITransactionHistory extends Document {
    memberId?: mongoose.Types.ObjectId;
    groupId?: mongoose.Types.ObjectId;
    type: 'person' | 'group';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reason: string;
    sessionId?: mongoose.Types.ObjectId; // Tham chiếu đến buổi đánh cầu lông nếu có
    createdAt: Date;
}

const transactionHistorySchema = new Schema({
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: false },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'BadmintonTeam', required: false },
    type: { type: String, enum: ['person', 'group'], required: true },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BadmintonSession' },
    createdAt: { type: Date, default: Date.now },
});

export const TransactionHistory = mongoose.model<ITransactionHistory>('TransactionHistory', transactionHistorySchema);
