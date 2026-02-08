import mongoose, { Schema, Document } from 'mongoose';

export interface BadmintonTeamMember {
    memberId: Schema.Types.ObjectId;
    isFixed: boolean;     // Thành viên cố định
    isActive: boolean;    // Còn tham gia nhóm không
    joinedAt: Date;
}

export interface BadmintonTeamDocument extends Document {
    name: string;
    amount: number;
    numberShuttlecock: number;
    shuttlecockFee: number;
    courtFee: number;
    note?: string;
    updateById: mongoose.Types.ObjectId;
    updateTime: Date,
    members: BadmintonTeamMember[];
}

const badmintonTeamSchema = new Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    numberShuttlecock: { type: Number, required: true, default: 0 },
    shuttlecockFee: { type: Number, required: true, default: 0 },
    courtFee: { type: Number, required: true, default: 0 },
    note: { type: String },
    updateById: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    updateTime: { type: Date, required: true, default: Date.now },
    members: [{
        memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
        isActive: { type: Boolean, default: true },
        isFixed: { type: Boolean, default: true },
        joinedAt: { type: Date, default: Date.now }
    }]

});


export const BadmintonTeam = mongoose.model<BadmintonTeamDocument>('BadmintonTeam', badmintonTeamSchema);
