import { Request, Response } from 'express';
import { SuccessResponse, InternalErrorResponse, BadRequestResponse } from '../common/responseType';
import { Member } from '../models/Member';
import { AuthenticatedRequest } from '../types/express';
import { TransactionHistory } from '../models/TransactionHistory';

// Lấy danh sách thành viên
export const getMembers = async (req: Request, res: Response) => {
  try {
    const members = await Member.find({ deletedAt: null });
    const result = members.map(m => {
      return {
        id: m._id,
        name: m.name,
        balance: m.balance,
        email: m.email,
        role: m.role
      }
    });
    return new SuccessResponse('ok', result).send(res);
  } catch (error) {
    return new InternalErrorResponse().send(res);
  }
};

export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return new BadRequestResponse('Không tìm thấy user').send(res);
    }
    const existing = await Member.findOne({ _id: req.user.id, deletedAt: null });
    if (!existing) {
      return new BadRequestResponse('Không tìm thấy user').send(res);
    }

    return new SuccessResponse('ok', {
      id: existing._id,
      name: existing.name,
      balance: existing.balance,
      email: existing.email,
      role: existing.role
    }).send(res);
  } catch (error) {
    return new InternalErrorResponse().send(res);
  }
}

// Thêm thành viên
export const addMember = async (req: Request, res: Response) => {
  try {
    console.log('Add member request body:', req.body)
    const { name, email, role } = req.body;
    const password = "123456"
    const balance = 0 // Luôn set balance = 0 cho tài khoản mới

    const count = await Member.countDocuments({ email, deletedAt: null });
    if (count > 0) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }
    const newMember = await Member.create({
      name,
      email,
      password,
      role, // optional: chỉ lead/admin mới được set role
      balance
    });

    console.log('Created member:', newMember)

    return new SuccessResponse('Thêm thành viên thành công', {
      id: newMember._id,
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      balance: newMember.balance
    }).send(res);
  } catch (error: any) {
    console.error('Error adding member:', error)
    if (error.code === 11000 && error.keyPattern.email) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    console.log(error)
    return new InternalErrorResponse().send(res);
  }
};

// Xóa thành viên (soft delete)
export const deleteMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Kiểm tra user có tồn tại không
    const member = await Member.findOne({ _id: id, deletedAt: null });
    if (!member) {
      return new BadRequestResponse('Không tìm thấy người dùng').send(res);
    }

    // Soft delete - set deletedAt
    const deletedMember = await Member.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );

    console.log('Soft deleted member:', deletedMember)

    return new SuccessResponse('Xóa người dùng thành công', null).send(res);
  } catch (error) {
    console.log(error);
    return new InternalErrorResponse().send(res);
  }
};

// Cập nhật thành viên
export const updateMember = async (req: Request, res: Response) => {
  try {
    console.log('Update member request:', req.params, req.body)
    const { id } = req.params;
    const { name, role, balance } = req.body;

    // Kiểm tra user có tồn tại không
    const member = await Member.findOne({ _id: id, deletedAt: null });
    if (!member) {
      return new BadRequestResponse('Không tìm thấy người dùng').send(res);
    }

    // Cập nhật thông tin
    const updatedMember = await Member.findByIdAndUpdate(
      id,
      { name, role, balance },
      { new: true }
    );

    if (!updatedMember) {
      return new BadRequestResponse('Không thể cập nhật người dùng').send(res);
    }

    console.log('Updated member:', updatedMember)

    return new SuccessResponse('Cập nhật thành công', {
      id: updatedMember._id,
      name: updatedMember.name,
      email: updatedMember.email,
      role: updatedMember.role,
      balance: updatedMember.balance
    }).send(res);
  } catch (error) {
    console.error('Error updating member:', error)
    console.log(error);
    return new InternalErrorResponse().send(res);
  }
};

// Khôi phục thành viên đã bị xóa
export const restoreMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Kiểm tra user có tồn tại và đã bị xóa không
    const member = await Member.findOne({ _id: id, deletedAt: { $ne: null } });
    if (!member) {
      return new BadRequestResponse('Không tìm thấy người dùng đã bị xóa').send(res);
    }

    // Khôi phục user - set deletedAt = null
    const restoredMember = await Member.findByIdAndUpdate(
      id,
      { deletedAt: null },
      { new: true }
    );

    if (!restoredMember) {
      return new BadRequestResponse('Không thể khôi phục người dùng').send(res);
    }

    console.log('Restored member:', restoredMember)

    return new SuccessResponse('Khôi phục người dùng thành công', {
      id: restoredMember._id,
      name: restoredMember.name,
      email: restoredMember.email,
      role: restoredMember.role,
      balance: restoredMember.balance
    }).send(res);
  } catch (error) {
    console.log(error);
    return new InternalErrorResponse().send(res);
  }
};

export const getTransactionHistoryByMemberId = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return new InternalErrorResponse().send(res);
    }
    if (user.role !== 'admin' && user.role !== 'lead') {
      return new InternalErrorResponse('Không có quyền truy cập').send(res);
    }
    const { id } = req.params;

    let memberId = id;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Build filter

    const filter: any = { type: 'person' };

    if (memberId) {
      filter.memberId = memberId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    // Query tổng số bản ghi để phân trang
    const totalCount = await TransactionHistory.countDocuments(filter);

    // Lấy dữ liệu với phân trang
    const transactions = await TransactionHistory.find(filter)
      .sort({ createdAt: -1 }) // sắp xếp mới nhất lên đầu
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      transactions,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};