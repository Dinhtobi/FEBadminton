import express from 'express';
import { getMembers, addMember, getUserProfile, deleteMember, updateMember, restoreMember, getTransactionHistoryByMemberId } from '../controllers/memberController';
import { login, register, refreshTokenHandler, logout, changePassword, healthCheck } from '../controllers/auth.controller';
import { acceptPayment, cancelPayment, createPayment, createPaymentForUser, getMyPayments } from '../controllers/paymentController';
import { getBadmintonSessions, getAllMembersWithBalance, createBadmintonSession, updateBadmintonSession, payBadmintonSession, getTransactionHistoryByGroup, getTransactionHistoryByMember, getAllBadmintonSessions, confirmBadmintonSession } from '../controllers/badmintonSessionController';
import asyncHandler from '../common/asyncHandler';
import { secureRoute } from '../middlewares/secureRoute';
import { createBadmintonTeam, updateBadmintonTeamFees, getBadmintonTeamById, payForShuttlecockFee } from '../controllers/badmintonTeam.controller';

const router = express.Router();

// GET /members - danh sách thành viên
router.get('/members', secureRoute('lead', 'admin', 'user'), asyncHandler(getMembers));

// POST /members - thêm thành viên mới
router.post('/members', secureRoute('lead', 'admin'), asyncHandler(addMember));

// PUT /members/:id - cập nhật thành viên
router.put('/members/:id', secureRoute('admin'), asyncHandler(updateMember));

// DELETE /members/:id - xóa thành viên (soft delete)
router.delete('/members/:id', secureRoute('admin'), asyncHandler(deleteMember));

// PATCH /members/:id/restore - khôi phục thành viên đã bị xóa
router.patch('/members/:id/restore', secureRoute('admin'), asyncHandler(restoreMember));

router.get('/members/me', secureRoute('lead', 'admin', 'user'), asyncHandler(getUserProfile));
router.get('/members/:id/transactions', secureRoute('lead', 'admin'), asyncHandler(getTransactionHistoryByMemberId));

router.post('/payments', secureRoute('lead', 'admin', 'user'), asyncHandler(createPayment));
router.get('/payments/me', secureRoute('lead', 'admin', 'user'), asyncHandler(getMyPayments));
router.post('/payments/user/:id', secureRoute('lead', 'admin'), asyncHandler(createPaymentForUser));

router.put('/payments/:id/accept', secureRoute('lead', 'admin'), asyncHandler(acceptPayment));
router.put('/payments/:id/reject', secureRoute('lead', 'admin'), asyncHandler(cancelPayment));
router.get('/badminton-session/list', secureRoute('lead', 'admin', 'user'), asyncHandler(getAllBadmintonSessions));
router.get('/badminton-session/:id', secureRoute('lead', 'admin', 'user'), asyncHandler(getBadmintonSessions));

router.post('/badminton-session', secureRoute('lead', 'admin'), asyncHandler(createBadmintonSession));
router.put('/badminton-session/:id', secureRoute('lead', 'admin', 'user'), asyncHandler(updateBadmintonSession));
router.put('/badminton-session/:id/confirm', secureRoute('lead', 'admin'), asyncHandler(confirmBadmintonSession));
router.put('/badminton-session/:id/pay', secureRoute('lead', 'admin'), asyncHandler(payBadmintonSession));
router.get('/all-members-balance', secureRoute('lead', 'admin', 'user'), asyncHandler(getAllMembersWithBalance));

router.get('/transactions/me', secureRoute('lead', 'admin', 'user'), asyncHandler(getTransactionHistoryByMember));
router.get('/transactions/groups', secureRoute('lead', 'admin', 'user'), asyncHandler(getTransactionHistoryByGroup));
// auth
router.post('/auth/login', asyncHandler(login))
router.post('/auth/register', asyncHandler(register))
router.post('/auth/refreshToken', asyncHandler(refreshTokenHandler))
router.post('/auth/logout', asyncHandler(logout))
router.patch('/auth/change-password', secureRoute('lead', 'admin', 'user'), asyncHandler(changePassword))

// badmintion team
router.post('/badminton-teams', secureRoute('admin'), asyncHandler(createBadmintonTeam));
router.patch('/badminton-teams/:id/add-fees', secureRoute('lead', 'admin'), asyncHandler(updateBadmintonTeamFees));
router.get('/badminton-teams/:id', secureRoute('lead', 'admin', 'user'), asyncHandler(getBadmintonTeamById));
router.post('/badminton-teams/pay-shuttlecock', secureRoute('lead', 'admin'), asyncHandler(payForShuttlecockFee));

router.get('/health', asyncHandler(healthCheck));

export default router;
