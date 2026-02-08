import { Request, Response } from 'express';
import mongoose, { ClientSession } from 'mongoose';
import { InternalErrorResponse, SuccessResponse, NotFoundResponse, BadRequestResponse } from '../common/responseType';
import { BadmintonSessionModel, Participant, BadmintonSession } from '../models/badmintonSession';
import { BadmintonTeam } from '../models/BadmintonTeam';
import { Member, MemberDocument } from '../models/Member';
import { Payment } from '../models/payment';
import { BadmintonSessionRequest, ParticipantRequest } from '../models/requests';
import { BadmintonSessionResponse, BadmintonSessionWaringResponse } from '../models/responses';
import { TransactionHistory } from '../models/TransactionHistory';
import paymentService from '../services/paymentService';
import PaymentService from '../services/paymentService';
import { formatDateVi } from '../utils/date';
import { splitFeeEvenlyInt } from '../utils/money';

// Tạo buổi đánh cầu lông mới
export const createBadmintonSession = async (req: Request, res: Response) => {
  try {
    const { courtType, dateList, location, courtFee, shuttlecockFee, participants, extraFee, note, startTime, endTime, groupId, numberShuttlecock } = req.body as BadmintonSessionRequest;
    const user = (req as any).user;
    console.log(participants)
    if (!courtType || !dateList || dateList.length < 0 || !location || !startTime || !endTime) {
      return new InternalErrorResponse("Thiếu thông tin bắt buộc tên sân hoặc ngày đánh").send(res);
    }

    let updatedParticipants = participants;

    if (participants.length > 0) {
      const validMembers = await Member.find({
        _id: { $in: participants.map(p => p.memberId) },
        deletedAt: null
      });

      if (validMembers.length !== participants.length) {
        return new InternalErrorResponse("Một hoặc nhiều thành viên không tồn tại trong hệ thống").send(res);
      }
    }

    if (courtType === 'casual') {
      let time = new Date(dateList[0])

      let updatedParticipants: Participant[] = await mapParticipantsRequestToParticipant(participants, courtFee, shuttlecockFee, extraFee);
      const newSession = new BadmintonSessionModel({
        courtType,
        time,
        startTime,
        endTime,
        location,
        courtFee,
        shuttlecockFee,
        extraFee,
        note,
        status: 'init',
        participantsCount: updatedParticipants.length,
        participants: updatedParticipants,
        updateTime: Date(),
        groupId,
        numberShuttlecock,
        updateById: user.id
      });

      await newSession.save();
      const populatedSession = await BadmintonSessionModel.findById(newSession._id)
        .populate('updateById', 'name')
        .lean();
      return new SuccessResponse('Tạo buổi đánh thành công', {
        ...populatedSession,
        updateById: populatedSession?.updateById?._id?.toString() || "",
        updateByName: (populatedSession?.updateById as any)?.name || ""
      }).send(res);
    }
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const date of dateList) {
        let time = new Date(date)
        const courtFeePerSession = courtFee / dateList.length
        const courtFeeApplied = participants.filter(p => p.isCourtFeeApplied);

        updatedParticipants = participants.map(p => ({
          ...p,
          courtFee: p.isCourtFeeApplied ? courtFeePerSession / courtFeeApplied.length : 0,
          shuttlecockFee: 0,
          extraFee: 0,
        }));
        const newSession = new BadmintonSessionModel({
          courtType,
          time,
          startTime,
          endTime,
          location,
          courtFee: courtFeePerSession,
          shuttlecockFee,
          extraFee,
          note,
          status: 'init',
          participantsCount: updatedParticipants.length,
          participants: updatedParticipants,
          updateTime: Date(),
          groupId,
          updateById: user.id
        });
        await newSession.save({ session });
      };

      const team = await PaymentService.findTeamByGroupId(groupId, session)
      if (courtType === 'fixed' && team.amount < courtFee) {
        return new BadRequestResponse("Trang thai khong hop le").send(res);
      }
      await PaymentService.updateTeamBalance(team, courtFee * -1, session);
      const dateFormat = dateList
        .map(date => formatDateVi(new Date(date)))
        .join(', ');
      let message = `Thanh toán tiền sân cố định ${location} các ngày ${dateFormat}`
      await PaymentService.recordTransactionHistoryForGroup(undefined, team, courtFee * -1, undefined, session, message);
      await session.commitTransaction();
      return new SuccessResponse('Tạo buổi đánh thành công', "OK").send(res);
    } catch (error) {
      console.log("ERROR", error);
      session.abortTransaction()
      session.endSession();
      return new InternalErrorResponse().send(res);
    }

  } catch (err) {
    console.log("ERROR", err);
    return new InternalErrorResponse().send(res);
  }
};

export const getAllBadmintonSessions = async (req: Request, res: Response) => {
  try {
    const sessionList = await BadmintonSessionModel.find()
      .populate('updateById', 'name')
      .sort({ time: -1 })
      .limit(20);
    const result = sessionList.map(m => {
      return {
        id: m.id,
        courtType: m.courtType,
        time: m.time,
        startTime: m.startTime,
        endTime: m.endTime,
        location: m.location,
        courtFee: m.courtFee,
        shuttlecockFee: m.shuttlecockFee,
        numberParticipant: m.participants.length,
        participants: [],
        extraFee: m.extraFee ?? 0,
        note: m.note,
        status: m.status,
        updateTime: m.updateTime,
        updateById: m.updateById?._id?.toString() || "",
        updateByName: (m.updateById as any)?.name || ""
      } as BadmintonSessionResponse
    })
    return new SuccessResponse('Lấy thông tin buổi đánh thành công', result).send(res);
  } catch (err) {
    console.error('Lỗi khi lấy session:', err);
    return new InternalErrorResponse().send(res);
  }
}

export const getBadmintonSessions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await BadmintonSessionModel.findById(id)
      .populate({
        path: 'participants.memberId',
        select: 'name balance'
      })
      .populate('updateById', 'name')
      .lean()
    if (!session) {
      return new InternalErrorResponse('Không tìm thấy buổi đánh cầu lông').send(res);
    }
    const participantList = session.participants.map((p) => {
      const member = p.memberId as any; // Type assertion since we know it's populated
      return {
        memberId: member._id.toString(),
        name: member.name,
        balance: member.balance,
        isCourtFeeApplied: p.isCourtFeeApplied,
        isShuttlecockFeeApplied: p.isShuttlecockFeeApplied,
        isExtraFeeApplied: p.isExtraFeeApplied,
        courtFee: p.courtFee,
        shuttlecockFee: p.shuttlecockFee,
        extraFee: p.extraFee,
        modifiedFee: p.modifiedFee,
        participants: p.subParticipants?.map(sub => ({
          name: sub.name,
          isCourtFeeApplied: sub.isCourtFeeApplied,
          isShuttlecockFeeApplied: sub.isShuttlecockFeeApplied,
          isExtraFeeApplied: sub.isExtraFeeApplied,
          courtFee: sub.courtFee,
          shuttlecockFee: sub.shuttlecockFee,
          extraFee: sub.extraFee
        })) || []
      }
    })
    const result = {
      id: session.id,
      courtType: session.courtType,
      time: session.time,
      startTime: session.startTime,
      endTime: session.endTime,
      location: session.location,
      courtFee: session.courtFee,
      shuttlecockFee: session.shuttlecockFee,
      numberParticipant: session.participants.length,
      participants: participantList,
      extraFee: session.extraFee,
      note: session.note,
      status: session.status,
      updateTime: session.updateTime,
      updateById: session.updateById?._id?.toString() || "",
      updateByName: (session.updateById as any)?.name || "",
      numberShuttlecock: session.numberShuttlecock
    } as unknown as BadmintonSessionResponse;
    return new SuccessResponse('Lấy thông tin buổi đánh thành công', result).send(res);
  } catch (err) {
    console.error('Lỗi khi lấy session:', err);
    return new InternalErrorResponse().send(res);
  }
};

export const getAllMembersWithBalance = async (req: Request, res: Response) => {
  try {
    // Lấy tất cả các thành viên (chưa bị xóa)
    const members = await Member.find({ deletedAt: null });

    // Lấy danh sách tất cả memberId từ các thành viên
    const memberIds = members.map((member: any) => new mongoose.Types.ObjectId(member._id));

    // Truy vấn Payment để tính tổng số tiền theo trạng thái cho từng memberId
    const result = await Payment.aggregate([
      {
        $match: {
          memberId: { $in: memberIds }, // Lọc theo các memberId
          status: { $in: ['accepted', 'pending'] } // Lọc theo trạng thái "accepted" và "pending"
        }
      },
      {
        $group: {
          _id: { memberId: '$memberId', status: '$status' }, // Nhóm theo memberId và status
          totalAmount: { $sum: '$amount' } // Tính tổng số tiền cho mỗi trạng thái
        }
      },
      {
        $project: {
          memberId: '$_id.memberId',
          status: '$_id.status',
          totalAmount: 1,
          _id: 0
        }
      }
    ]);

    // Tạo map để lưu số dư của từng người theo trạng thái
    const balanceMap = result.reduce((acc, item) => {
      const memberId = item.memberId.toString();
      if (!acc[memberId]) {
        acc[memberId] = { pending: 0, accepted: 0 }; // Khởi tạo số tiền mặc định cho các trạng thái
      }
      if (item.status === 'pending') {
        acc[memberId].pending = item.totalAmount; // Lưu số tiền theo trạng thái pending
      } else if (item.status === 'accepted') {
        acc[memberId].accepted = item.totalAmount; // Lưu số tiền theo trạng thái accepted
      }
      return acc;
    }, {} as Record<string, { pending: number; accepted: number }>);

    // Tạo dữ liệu trả về cho mỗi memberId, bao gồm số tiền theo từng trạng thái
    const data = members.map(member => ({
      memberId: member._id.toString(),
      name: member.name,
      balance: member.balance,
      statusAmounts: balanceMap[member._id.toString()] || { pending: 0, accepted: 0 } // Nếu không có payment thì trả về số dư 0
    }));

    return new SuccessResponse('Lấy thông tin thành viên và số dư thanh toán thành công', data).send(res);

  } catch (err) {
    return new InternalErrorResponse('Lỗi server').send(res);
  }
};
export const updateBadmintonSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { courtType, dateList, location, courtFee, shuttlecockFee, participants, extraFee, note, startTime, endTime, numberShuttlecock, groupId } = req.body as BadmintonSessionRequest;
    const user = (req as any).user;

    if (!id) {
      return new InternalErrorResponse("Thiếu ID buổi đánh").send(res);
    }

    const session = await BadmintonSessionModel.findById(id);
    if (!session) {
      return new InternalErrorResponse("Buổi đánh không tồn tại").send(res);
    }

    if (!courtType || !dateList || dateList.length < 0 || !location || !startTime || !endTime) {
      return new InternalErrorResponse("Thiếu thông tin bắt buộc: ngày giờ hoặc tên sân").send(res);
    }

    let updatedParticipants: Participant[] = []

    if (participants.length > 0) {
      const validMembers = await Member.find({
        _id: { $in: participants.map(p => p.memberId) },
        deletedAt: null
      });

      if (validMembers.length !== participants.length) {
        return new InternalErrorResponse("Một hoặc nhiều thành viên không tồn tại trong hệ thống").send(res);
      }
      updatedParticipants = await mapParticipantsRequestToParticipant(participants, courtFee, shuttlecockFee, extraFee);
    }
    if (session.status !== 'init' && session.status !== 'edited') {
      return new BadRequestResponse("Trang thai khong hop le").send(res);
    }
    const team = await BadmintonTeam.findById(groupId)
    if (!team) {
      return new NotFoundResponse('Không tìm thấy đội cầu lông').send(res);
    }
    session.time = dateList[0];
    session.startTime = startTime;
    session.endTime = endTime;
    session.location = location;
    if (courtType !== 'fixed') {
      session.courtFee = courtFee;
    }
    session.shuttlecockFee = shuttlecockFee;
    session.extraFee = extraFee;
    session.note = note;
    session.status = 'edited';
    session.participants = updatedParticipants;
    session.participantsCount = updatedParticipants.length;
    session.updateTime = new Date()
    session.numberShuttlecock = numberShuttlecock
    session.updateById = user.id
    await session.save();
    const updatedSession = await BadmintonSessionModel.findById(session._id)
      .populate('updateById', 'name')
      .lean();
    const errors: Partial<Record<'numberShuttlecock' | 'shuttlecockFee', string>> = {};
    // Kiểm tra số cầu lông hợp lệ
    if (team.numberShuttlecock < numberShuttlecock) {
      errors.numberShuttlecock = "Vượt quá số lượng cầu của nhóm";
    }

    // Kiểm tra phí cầu lông hợp lệ
    if (team.amount < shuttlecockFee) {
      errors.shuttlecockFee = "Phí cầu vượt quá ngân sách nhóm";
    }
    const result = {
      session: {
        ...updatedSession,
        updateById: updatedSession?.updateById || null,
        updateByName: (updatedSession?.updateById as any)?.name || ""
      } as unknown as BadmintonSession,
      errors
    } as BadmintonSessionWaringResponse
    return new SuccessResponse("Cập nhật buổi đánh thành công", result).send(res);
  } catch (err) {
    console.error("ERROR", err);
    return new InternalErrorResponse().send(res);
  }
};

export const confirmBadmintonSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { courtType, dateList, location, courtFee, shuttlecockFee, participants, extraFee, note, startTime, endTime, numberShuttlecock, groupId } = req.body as BadmintonSessionRequest;
    const user = (req as any).user;

    if (!id) {
      return new InternalErrorResponse("Thiếu ID buổi đánh").send(res);
    }

    const session = await BadmintonSessionModel.findById(id);
    if (!session) {
      return new InternalErrorResponse("Buổi đánh không tồn tại").send(res);
    }

    if (!courtType || !dateList || dateList.length < 0 || !location || !startTime || !endTime) {
      return new InternalErrorResponse("Thiếu thông tin bắt buộc: ngày giờ hoặc tên sân").send(res);
    }

    const team = await BadmintonTeam.findById(groupId)
    if (!team) {
      return new NotFoundResponse('Không tìm thấy đội cầu lông').send(res);
    }

    let updatedParticipants: Participant[] = []

    if (participants.length > 0) {
      const validMembers = await Member.find({
        _id: { $in: participants.map(p => p.memberId) },
        deletedAt: null
      });

      if (validMembers.length !== participants.length) {
        return new InternalErrorResponse("Một hoặc nhiều thành viên không tồn tại trong hệ thống").send(res);
      }
      updatedParticipants = await mapParticipantsRequestToParticipant(participants, courtFee, shuttlecockFee, extraFee);
    }
    if (session.status !== 'edited') {
      return new BadRequestResponse("Trang thai khong hop le").send(res);
    }
    const errors: Partial<Record<'numberShuttlecock' | 'shuttlecockFee', string>> = {};
    // Kiểm tra số cầu lông hợp lệ
    var isValidShuttlecock = true
    if (team.numberShuttlecock < numberShuttlecock) {
      errors.numberShuttlecock = "Vượt quá số lượng cầu của nhóm";
      isValidShuttlecock = false
    }

    // Kiểm tra phí cầu lông hợp lệ
    if (team.amount < shuttlecockFee) {
      errors.shuttlecockFee = "Phí cầu vượt quá ngân sách nhóm";
      isValidShuttlecock = false
    }
    if (!isValidShuttlecock) {
      const result = {
        session,
        errors
      } as BadmintonSessionWaringResponse
      return new SuccessResponse("Xác nhận buổi đánh không thành công", result).send(res);
    }

    // Cập nhật thông tin
    session.time = dateList[0];
    session.startTime = startTime;
    session.endTime = endTime;
    session.location = location;
    if (courtType !== 'fixed') {
      session.courtFee = courtFee;
    }
    session.shuttlecockFee = shuttlecockFee;
    session.extraFee = extraFee;
    session.note = note;
    session.status = 'confirmed';
    session.participants = updatedParticipants;
    session.participantsCount = updatedParticipants.length;
    session.updateTime = new Date()
    session.numberShuttlecock = numberShuttlecock
    session.updateById = user.id
    await session.save();
    const confirmedSession = await BadmintonSessionModel.findById(session._id)
      .populate('updateById', 'name')
      .lean();
    const result = {
      session: {
        ...confirmedSession,
        updateById: confirmedSession?.updateById || null,
        updateByName: (confirmedSession?.updateById as any)?.name || ""
      } as unknown as BadmintonSession,
      errors
    } as BadmintonSessionWaringResponse
    return new SuccessResponse("Xác nhận buổi đánh  thành công", result).send(res);
  } catch (err) {
    console.error("ERROR", err);
    return new InternalErrorResponse().send(res);
  }
};


export const payBadmintonSession = async (req: Request, res: Response) => {
  const { id } = req.params

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();
    const session = await BadmintonSessionModel.findById(id).session(mongoSession);
    if (!session) {
      await mongoSession.abortTransaction();
      return res.status(404).json({ message: 'Không tìm thấy buổi đánh' });
    }

    if (session.status !== 'confirmed') {
      await mongoSession.abortTransaction();
      return res.status(400).json({ message: 'Chỉ buổi đánh ở trạng thái "confirmed" mới được thanh toán' });
    }

    const memberIds = session.participants.map(p => p.memberId);
    const members = await Member.find({ _id: { $in: memberIds }, deletedAt: null }).session(mongoSession);

    if (members.length !== session.participants.length) {
      await mongoSession.abortTransaction();
      return res.status(400).json({ message: 'Một hoặc nhiều thành viên không tồn tại' });
    }
    const group = await BadmintonTeam.findById(session.groupId).session(mongoSession);
    if (!group) {
      await mongoSession.abortTransaction();
      return res.status(400).json({ message: 'Group khong ton tai' });
    }

    // Trừ tiền từng thành viên
    for (const participant of session.participants) {
      const member = members.find(m => m._id.toString() === participant.memberId.toString());
      if (!member) continue;

      // Calculate main participant's total fee
      const participantTotalFee = participant.courtFee + participant.shuttlecockFee + participant.extraFee + participant.modifiedFee;

      // Calculate total fee for all sub-participants
      const subParticipantsTotalFee = participant.subParticipants?.reduce((sum, sub) =>
        sum + sub.courtFee + sub.shuttlecockFee + sub.extraFee, 0) || 0;

      // Total fee to deduct = main participant fee + sub-participants fees
      const totalFee = participantTotalFee + subParticipantsTotalFee;

      if (member.balance < totalFee) {
        await mongoSession.abortTransaction();
        return res.status(400).json({
          message: `Member ${member.name || member._id} has insufficient balance for payment`
        });
      }
      const balanceBefore = member.balance;
      member.balance -= totalFee;
      const balanceAfter = member.balance;
      await member.save({ session: mongoSession });
      const history = new TransactionHistory({
        memberId: member._id,
        sessionId: session._id,
        amount: totalFee,
        type: 'person',
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        reason: `Thanh toán buổi đánh sân ${session.location} ngày  ${formatDateVi(new Date(session.time))}`
      });
      await history.save({ session: mongoSession });
    }

    // Cập nhật trạng thái session
    session.status = 'done';
    session.updateTime = new Date();
    await session.save({ session: mongoSession });
    await session.populate({
      path: 'participants.memberId',
      select: 'name balance',
      options: { session: mongoSession }, // ✅ đúng cách
    });

    if (session.numberShuttlecock !== 0) {
      group.shuttlecockFee = group.shuttlecockFee - (session.numberShuttlecock * group.shuttlecockFee / group.numberShuttlecock)
      group.numberShuttlecock = group.numberShuttlecock - session.numberShuttlecock
    }

    let sumModifiedFee = session.participants.reduce((sum, p) => {
      return sum + (p.modifiedFee ?? 0);
    }, 0);
    if (session.courtType !== 'fixed') {
      let totalFee = session.courtFee + session.extraFee + sumModifiedFee
      group.amount = group.amount - totalFee
      await paymentService.recordTransactionHistoryForGroup(undefined, group, totalFee * -1, session, mongoSession, `[VÃNG LAI]Thanh toán buổi đánh cầu lông sân ${session.location} ngày  ${formatDateVi(session.time)} (-${session.numberShuttlecock} cầu/ còn ${group.numberShuttlecock})`)
    } else {
      let totalFee = session.extraFee + sumModifiedFee
      group.amount = group.amount - totalFee
      await paymentService.recordTransactionHistoryForGroup(undefined, group, totalFee * -1, session, mongoSession, `[CỐ ĐỊNH]Thanh toán buổi đánh cầu lông sân ${session.location} ngày ${formatDateVi(session.time)} (-${session.numberShuttlecock} cầu/ còn ${group.numberShuttlecock})`)
    }
    await group.save({ session: mongoSession })

    await mongoSession.commitTransaction();
    const paidSession = await BadmintonSessionModel.findById(session._id)
      .populate('updateById', 'name')
      .lean();
    return new SuccessResponse('Thanh toán thành công', {
      ...paidSession,
      updateById: paidSession?.updateById?._id?.toString() || "",
      updateByName: (paidSession?.updateById as any)?.name || ""
    }).send(res);
  } catch (err) {
    console.error('TRANSACTION ERROR:', err);
    await mongoSession.abortTransaction();
    return new InternalErrorResponse().send(res);
  } finally {
    mongoSession.endSession();
  }
};

export const getTransactionHistoryByMember = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return new InternalErrorResponse().send(res);
    }
    let memberId = user.id.toString()

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Build filter
    const filter: any = { memberId };
    filter.type = 'person'
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

export const getTransactionHistoryByGroup = async (req: Request, res: Response) => {
  try {
    const groupId = req.query.groupId
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Build filter
    const filter: any = { groupId };
    filter.type = 'group'
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

export async function mapParticipantsRequestToParticipant(
  participantsRequest: ParticipantRequest[],
  courtFee: number,
  shuttlecockFee: number,
  extraFee: number
): Promise<Participant[]> {
  const memberIds = participantsRequest.map(p => p.memberId);
  const members = await Member.find({ _id: { $in: memberIds }, deletedAt: null });

  const memberMap = new Map<string, MemberDocument>();
  members.forEach(m => {
    memberMap.set(m._id.toString(), m);
  });

  // Đếm số người được áp dụng từng loại phí (bao gồm cả sub-participants)
  const courtFeeApplied = participantsRequest.reduce((count, p) => {
    return count + (p.isCourtFeeApplied ? 1 : 0) +
      (p.participants?.filter(sub => sub.isCourtFeeApplied).length || 0);
  }, 0);

  const shuttlecockFeeApplied = participantsRequest.reduce((count, p) => {
    return count + (p.isShuttlecockFeeApplied ? 1 : 0) +
      (p.participants?.filter(sub => sub.isShuttlecockFeeApplied).length || 0);
  }, 0);

  const extraFeeApplied = participantsRequest.reduce((count, p) => {
    return count + (p.isExtraFeeApplied ? 1 : 0) +
      (p.participants?.filter(sub => sub.isExtraFeeApplied).length || 0);
  }, 0);

  // Tính phí cho mỗi người sử dụng splitFeeEvenlyInt
  const courtFeeList = splitFeeEvenlyInt(courtFee, courtFeeApplied);
  const shuttlecockFeeList = splitFeeEvenlyInt(shuttlecockFee, shuttlecockFeeApplied);
  const extraFeeList = splitFeeEvenlyInt(extraFee, extraFeeApplied);

  let courtIndex = 0;
  let shuttleIndex = 0;
  let extraIndex = 0;

  return participantsRequest.map((p) => {
    const memberDoc = memberMap.get(p.memberId);
    if (!memberDoc) {
      throw new Error(`Member with ID ${p.memberId} not found`);
    }

    const courtShare = p.isCourtFeeApplied ? courtFeeList[courtIndex++] : 0;
    const shuttleShare = p.isShuttlecockFeeApplied ? shuttlecockFeeList[shuttleIndex++] : 0;
    const extraShare = p.isExtraFeeApplied ? extraFeeList[extraIndex++] : 0;

    return {
      memberId: memberDoc,
      isCourtFeeApplied: p.isCourtFeeApplied,
      isShuttlecockFeeApplied: p.isShuttlecockFeeApplied,
      isExtraFeeApplied: p.isExtraFeeApplied,
      courtFee: courtShare,
      shuttlecockFee: shuttleShare,
      extraFee: extraShare,
      modifiedFee: p.modifiedFee ?? 0,
      subParticipants: p.participants?.map(sub => ({
        name: sub.name,
        isCourtFeeApplied: sub.isCourtFeeApplied,
        isShuttlecockFeeApplied: sub.isShuttlecockFeeApplied,
        isExtraFeeApplied: sub.isExtraFeeApplied,
        courtFee: sub.isCourtFeeApplied ? courtFeeList[courtIndex++] : 0,
        shuttlecockFee: sub.isShuttlecockFeeApplied ? shuttlecockFeeList[shuttleIndex++] : 0,
        extraFee: sub.isExtraFeeApplied ? extraFeeList[extraIndex++] : 0
      })) || []
    };
  });
}
