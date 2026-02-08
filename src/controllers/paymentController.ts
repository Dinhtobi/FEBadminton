import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { BadRequestError } from '../common/apiError';
import { InternalErrorResponse, SuccessMsgResponse, SuccessResponse, NotFoundResponse, BadRequestResponse } from '../common/responseType';
import { Payment } from '../models/payment';
import { PaginationResult } from '../models/responses';
import PaymentService, { getMemberById } from '../services/paymentService';
import { AuthenticatedRequest } from '../types/express';
import { Member } from '../models/Member';

export const acceptPayment = async (req: Request, res: Response) => {
  try {
    const { id, groupId } = req.params;
    const payment = await PaymentService.acceptPayment(id);
    return new SuccessResponse('Duyệt thanh toán và cộng tiền thành công', payment).send(res);
  } catch (err: any) {
    console.log('err instanceof BadRequestError:', err instanceof BadRequestError);
    console.log('err.constructor.name:', err.constructor.name);
    console.log('err:', err);
    if (err instanceof BadRequestError) {
      return new BadRequestResponse(err.message).send(res);
    }
    return new InternalErrorResponse('Lỗi server').send(res);
  }
};

export const cancelPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await PaymentService.cancelPayment(id);
    return new SuccessResponse('Không chấp nhận', payment).send(res);
  } catch (err: any) {
    console.log('err instanceof BadRequestError:', err instanceof BadRequestError);
    if (err instanceof BadRequestError) {
      return new BadRequestResponse(err.message).send(res);
    }
    return new InternalErrorResponse('Lỗi server').send(res);
  }
};
export const createPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { groupId, amount, note } = req.body;

    if (!req.user?.id || !amount || !groupId) {
      return new BadRequestResponse("Thiếu memberId hoặc amount hoac groupId").send(res);
    }
    let editedNote = `[${req.user.name}] ${note === '' ? "Nạp tiền" : note}`
    const payment = new Payment({
      memberId: req.user.id,
      groupId: groupId,
      amount,
      note: editedNote,
      status: 'pending',
      updateById: req.user.id
    });

    await payment.save();
    await payment.populate('memberId');
    return new SuccessResponse('Create Payment successfully', payment).send(res);
  } catch (err) {
    next(err);
  }
};

export const getMyPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role
    const { status, page = 1, limit = 10 } = req.query;
    const filters: any = {};
    if (role === 'user') {
      filters.memberId = userId
    }

    if (status && ['pending', 'accepted', 'rejected'].includes(String(status))) {
      filters.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [total, payments] = await Promise.all([
      Payment.countDocuments(filters),
      Payment.find(filters)
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
    ]);

    const paginatedResult = new PaginationResult(payments, total, Number(page), Number(limit));
    return new SuccessResponse("ok", paginatedResult).send(res)
  } catch (err) {
    return new InternalErrorResponse('Lỗi server').send(res);
  }
};

export const createPaymentForUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { groupId, amount, note } = req.body;
    const { id } = req.params;

    console.log('Create payment for user:', { groupId, amount, note, id });
    if (!req.user?.id || !amount || !groupId || !id) {
      return new BadRequestResponse("Thiếu memberId hoặc amount hoac groupId").send(res);
    }

    const member = await Member.findOne({ _id: id, deletedAt: null });
    if (!member) {
      throw new BadRequestError('Member not found');
    }

    let editedNote = `[${req.user.name} -> ${member.name}] ${note === '' ? "Nạp tiền" : note}`
    const payment = new Payment({
      memberId: member._id,
      groupId: groupId,
      amount,
      note: editedNote,
      status: 'pending',
      updateById: req.user.id
    });

    await payment.save();
    await payment.populate('memberId');
    return new SuccessResponse('Create Payment successfully', payment).send(res);
  } catch (err) {
    next(err);
  }
};
