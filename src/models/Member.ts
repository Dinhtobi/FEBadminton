import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface MemberDocument extends mongoose.Document {
  _id: Types.ObjectId;
  name: string;
  balance: number;
  email: string;
  password: string;
  role: 'user' | 'lead' | 'admin';
  deletedAt?: Date;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  role: {
    type: String,
    enum: ['user', 'lead', 'admin'],
    default: 'user',
  },
  deletedAt: { type: Date, default: null }
}, {
  toJSON: {
    transform(doc, ret) {
      delete (ret as any).password;
      return ret;
    }
  },
  toObject: {
    transform(doc, ret) {
      delete (ret as any).password;
      return ret;
    }
  }
});

// Index cho soft delete
memberSchema.index({ deletedAt: 1 });

memberSchema.pre<MemberDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

memberSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Member = mongoose.model<MemberDocument>('Member', memberSchema);
