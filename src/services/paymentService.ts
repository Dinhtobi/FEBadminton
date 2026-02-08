import mongoose, { ClientSession } from 'mongoose';
import { BadRequestError } from '../common/apiError';
import { InternalErrorResponse, NotFoundResponse, SuccessMsgResponse, SuccessResponse } from '../common/responseType';
import { BadmintonTeam } from '../models/BadmintonTeam';
import { Member } from '../models/Member';
import { Payment } from '../models/payment';
import { TransactionHistory } from '../models/TransactionHistory';

// async function acceptPayment(paymentId: string) {
//     const session: ClientSession = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const payment = await Payment.findById(paymentId).session(session);
//         if (!payment) {
//             throw new BadRequestError('Không tìm thấy payment');
//         }

//         if (payment.status === 'accepted') {
//             // await session.abortTransaction();
//             throw new BadRequestError('Payment da o trang thai');
//         }

//         // Cập nhật trạng thái payment
//         payment.status = 'accepted';
//         await payment.save({ session });

//         // Cộng số dư vào member
//         const member = await Member.findById(payment.memberId).session(session);
//         if (!member) {
//             throw new BadRequestError('Không tìm thấy member');
//         }
//         const balancePersonBefore = (member.balance || 0);
//         member.balance = (member.balance || 0) + payment.amount;

//         const historyForMember = new TransactionHistory({
//             memberId: member._id,
//             amount: payment.amount,
//             type: 'person',
//             balanceBefore: balancePersonBefore,
//             balanceAfter: member.balance,
//             reason: `Nạp tiền`
//         });
//         await historyForMember.save({ session })
//         //Cộng số dư vào Group
//         const badmintonTeam = await BadmintonTeam.findById("payment.memberId").session(session);
//         if (!badmintonTeam) {
//             throw new BadRequestError('Không tìm thấy badmintonTeam');
//         }
//         const balanceGroupBefore = (badmintonTeam.amount || 0)
//         badmintonTeam.amount = (badmintonTeam.amount || 0) + payment.amount

//         await badmintonTeam.save({ session })

//         const historyForGroup = new TransactionHistory({
//             memberId: member._id,
//             amount: payment.amount,
//             type: 'group',
//             balanceBefore: balanceGroupBefore,
//             balanceAfter: badmintonTeam.amount,
//             reason: `${member.name} Nạp tiền`
//         });
//         await historyForGroup.save({ session })

//         await member.save({ session });

//         await session.commitTransaction();

//         return payment;
//     } catch (err) {
//         await session.abortTransaction();
//         throw err;
//     } finally {
//         session.endSession();
//     }

// }

export async function acceptPayment(paymentId: string) {
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
        const payment = await getPaymentById(paymentId, session);

        if (payment.status === 'accepted') {
            throw new BadRequestError('Payment is already accepted.');
        }

        const member = await getMemberById(payment.memberId.toString(), session);

        await updateMemberBalance(member, payment.amount, session);
        await recordTransactionHistoryForMember(member, payment.amount, session);

        const team = await findTeamByGroupId(payment.groupId.toString(), session);

        await updateTeamBalance(team, payment.amount, session);
        await recordTransactionHistoryForGroup(member, team, payment.amount, undefined, session);

        // Update payment status
        payment.status = 'accepted';
        await payment.save({ session });

        await session.commitTransaction();
        return payment;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

// === Helper functions ===

export async function getPaymentById(paymentId: string, session: ClientSession) {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) {
        throw new BadRequestError('Payment not found');
    }
    return payment;
}

export async function getMemberById(memberId: string, session: ClientSession) {
    const member = await Member.findOne({ _id: memberId, deletedAt: null }).session(session);
    if (!member) {
        throw new BadRequestError('Member not found');
    }
    return member;
}

export async function updateMemberBalance(member: any, amount: number, session: ClientSession) {
    member.balance = (member.balance || 0) + amount;
    await member.save({ session });
}

export async function recordTransactionHistoryForMember(member: any, amount: number, session: ClientSession) {
    const history = new TransactionHistory({
        memberId: member._id,
        amount,
        type: 'person',
        balanceBefore: member.balance - amount,
        balanceAfter: member.balance,
        reason: `Nạp tiền`
    });
    await history.save({ session });
}

export async function findTeamByGroupId(groupId: string, session: ClientSession) {
    const team = await BadmintonTeam.findById(groupId).session(session);

    if (!team) {
        throw new BadRequestError('Badminton team not found for this member');
    }

    return team;
}

async function updateTeamBalance(team: any, amount: number, session: ClientSession) {
    team.amount = (team.amount || 0) + amount;
    await team.save({ session });
}

async function recordTransactionHistoryForGroup(member: any | undefined, team: any, amount: number, badmintonSession: any | undefined, session: ClientSession, note: string = '') {
    const history = new TransactionHistory({
        ...(member && { memberId: member._id }),
        groupId: team._id,
        amount,
        type: 'group',
        balanceBefore: team.amount - amount,
        balanceAfter: team.amount,
        sessionId: badmintonSession ? badmintonSession._id : undefined,
        reason: !note ? `${member ? member.name : 'Giao dich'} nap tien` : note
    });
    await history.save({ session });
}

async function cancelPayment(paymentId: string) {
    try {
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw new BadRequestError('Không tìm thấy payment');
        }

        if (payment.status !== 'pending') {
            throw new BadRequestError('Payment da o trang thai');
        }

        // Cập nhật trạng thái payment
        payment.status = 'rejected';
        await payment.save();

        return payment;
    } catch (err) {
        throw err;
    }
}

export default {
    acceptPayment,
    cancelPayment,
    getPaymentById,
    getMemberById,
    recordTransactionHistoryForMember,
    findTeamByGroupId,
    recordTransactionHistoryForGroup,
    updateTeamBalance
};