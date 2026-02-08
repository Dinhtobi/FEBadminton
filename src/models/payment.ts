import mongoose, { Schema, Document } from 'mongoose';

export interface PaymentDocument extends Document {
  memberId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  note?: string;
  status: 'pending' | 'accepted' | 'rejected';
  updateById: mongoose.Types.ObjectId;
  updateTime: Date
}

const paymentSchema = new Schema({
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  groupId: { type: Schema.Types.ObjectId, ref: 'BadmintonTeam', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  note: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  updateById: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  updateTime: { type: Date, required: true, default: Date.now },
});

export const Payment = mongoose.model<PaymentDocument>('Payment', paymentSchema);
