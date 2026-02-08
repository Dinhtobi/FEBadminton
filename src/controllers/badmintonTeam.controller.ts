import { Request, Response } from 'express';
import { BadmintonTeam } from '../models/BadmintonTeam';
import { SuccessResponse, BadRequestResponse, InternalErrorResponse, NotFoundResponse } from '../common/responseType';
import mongoose, { ClientSession } from 'mongoose';
import { BadRequestError } from '../common/apiError';
import { ShuttlecockFeeRequest } from '../models/requests';
import PaymentService from '../services/paymentService';

export const createBadmintonTeam = async (req: Request, res: Response) => {
    try {
        const {
            name,
            amount,
            numberShuttlecock,
            shuttlecockFee,
            courtFee,
            note,
            updateById,
            members, // [{ memberId, isFixed, isActive }]
        } = req.body;

        // Validate required fields
        if (!name || !updateById || !Array.isArray(members)) {
            throw new BadRequestError('Missing required fields');
        }

        const team = new BadmintonTeam({
            name,
            amount,
            numberShuttlecock,
            shuttlecockFee,
            courtFee,
            note,
            updateById,
            members,
            updateTime: new Date()
        });

        await team.save();
        return new SuccessResponse('Tạo nhóm cầu lông thành công', team).send(res);
    } catch (err) {
        console.error('Error creating badminton team:', err);
        return new InternalErrorResponse().send(res);
    }
}


export const updateBadmintonTeamFees = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { numberShuttlecock, shuttlecockFee, fixedCourtFee, updateById } = req.body;

        const existing = await BadmintonTeam.findById(id);
        if (!existing) {
            return new BadRequestResponse('Không tìm thấy team').send(res);
        }

        existing.numberShuttlecock += numberShuttlecock || 0;
        existing.shuttlecockFee += shuttlecockFee || 0;
        // existing.fixedCourtFee += fixedCourtFee || 0;
        existing.updateById = updateById;
        existing.updateTime = new Date();

        await existing.save();

        return new SuccessResponse('Cập nhật thành công', existing).send(res);
    } catch (err) {
        console.error('Lỗi khi cập nhật team:', err);
        return new InternalErrorResponse().send(res);
    }
};

export const getBadmintonTeamById = async (req: Request, res: Response) => {
    const { id } = req.params;

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return new BadRequestResponse('ID không hợp lệ').send(res);
    }

    try {
        const team = await BadmintonTeam.findById(id)
            .populate('updateById');

        if (!team) {
            return new NotFoundResponse('Không tìm thấy đội cầu lông').send(res);
        }

        return new SuccessResponse('Lấy thông tin đội thành công', team).send(res);
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết BadmintonTeam:', error);
        return new InternalErrorResponse().send(res);
    }
};


export const payForShuttlecockFee = async (req: Request, res: Response) => {
    const { groupId, shuttlecockFee, numberShuttlecock } = req.body as ShuttlecockFeeRequest;

    // validation
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return new BadRequestResponse('ID không hợp lệ').send(res);
    }

    try {
        const session: ClientSession = await mongoose.startSession();
        session.startTransaction();
        const team = await PaymentService.findTeamByGroupId(groupId, session)
        if (!team) {
            return new BadRequestResponse('groupId không hợp lệ').send(res);
        }
        if (shuttlecockFee > team.amount) {
            return new BadRequestResponse('Nhóm không đủ tiền mua cầu, vui lòng nạp tiền').send(res);
        }
        let message = `Thanh toán ${shuttlecockFee} cho ${numberShuttlecock.toString()} quả cầu`;
        team.numberShuttlecock = Number(team.numberShuttlecock) + Number(numberShuttlecock)
        team.shuttlecockFee = Number(team.shuttlecockFee) + Number(shuttlecockFee)
        await PaymentService.updateTeamBalance(team, shuttlecockFee * -1, session);
        await PaymentService.recordTransactionHistoryForGroup(undefined, team, shuttlecockFee * -1, undefined, session, message);
        await session.commitTransaction();
        return new SuccessResponse('Thanh toán tiền cầu thành công', team).send(res);
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết BadmintonTeam:', error);
        return new InternalErrorResponse().send(res);
    }
};
