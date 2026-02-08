import mongoose, { Schema, Document } from 'mongoose';
import { MemberDocument } from './Member';

export interface Participant {
  memberId: MemberDocument;
  courtFee: number;
  shuttlecockFee: number;
  extraFee: number;
  modifiedFee: number;
  isCourtFeeApplied: boolean;
  isShuttlecockFeeApplied: boolean;
  isExtraFeeApplied: boolean;
  subParticipants?: {
    name: string;
    isCourtFeeApplied: boolean;
    isShuttlecockFeeApplied: boolean;
    isExtraFeeApplied: boolean;
    courtFee: number;
    shuttlecockFee: number;
    extraFee: number;
  }[];
}

export interface BadmintonSession extends Document {
  courtType: "fixed" | "casual",
  time: Date; // Thời gian buổi đánh
  startTime: string;
  endTime: string;
  location: string; // Địa chỉ
  courtFee: number; // Tiền sân
  shuttlecockFee: number; // Tiền cầu
  participantsCount: number; // Số lượng người tham gia
  participants: Participant[];
  extraFee: number; // Thêm trường này
  note?: string;
  status: 'init' | 'edited' | 'confirmed' | 'done';
  updateTime: Date;
  updateById: MemberDocument;
  groupId: string
  numberShuttlecock: number
}

const badmintonSessionSchema = new Schema({
  courtType: { type: String, enum: ['fixed', 'casual'] },
  time: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  location: { type: String, required: true },
  courtFee: { type: Number, required: true },
  shuttlecockFee: { type: Number, required: true },
  participantsCount: { type: Number, required: true },
  participants: [
    {
      _id: false,
      memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
      courtFee: { type: Number, default: 0 },
      shuttlecockFee: { type: Number, default: 0 },
      extraFee: { type: Number, default: 0 },
      modifiedFee: { type: Number, default: 0 },
      isCourtFeeApplied: { type: Boolean, default: false },
      isShuttlecockFeeApplied: { type: Boolean, default: false },
      isExtraFeeApplied: { type: Boolean, default: false },
      subParticipants: [{
        _id: false,
        name: { type: String, required: true },
        isCourtFeeApplied: { type: Boolean, default: false },
        isShuttlecockFeeApplied: { type: Boolean, default: false },
        isExtraFeeApplied: { type: Boolean, default: false },
        courtFee: { type: Number, default: 0 },
        shuttlecockFee: { type: Number, default: 0 },
        extraFee: { type: Number, default: 0 }
      }]
    }
  ],
  extraFee: { type: Number, required: true, default: 0 },
  note: { type: String },
  status: { type: String, enum: ['init', 'edited', 'confirmed', 'done'], default: 'init' },
  updateTime: { type: Date, required: true, default: Date() },
  updateById: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: false },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'BadmintonTeam', required: true },
  numberShuttlecock: { type: Number, required: true, default: 0 }
});

const BadmintonSessionModel = mongoose.model<BadmintonSession>('BadmintonSession', badmintonSessionSchema);

export { BadmintonSessionModel };
