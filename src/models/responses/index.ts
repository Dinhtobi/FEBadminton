import { BadmintonSession } from "../badmintonSession"
import { BadmintonTeamDocument } from "../BadmintonTeam"

export interface BadmintonSessionResponse {
    id: string
    courtType: 'fixed' | 'casual'
    time: Date
    startTime: string
    endTime: string
    location: string
    courtFee: number
    shuttlecockFee: number
    numberParticipant: number
    participants: ParticipantResponse[]
    extraFee: number
    note?: string;
    status: 'init' | 'edited' | 'done';
    updateTime: Date
    updateById?: string
    updateByName?: string
}


export interface ParticipantResponse {
    memberId: string
    name: string
    isCourtFeeApplied: boolean
    isShuttlecockFeeApplied: boolean,
    isExtraFeeApplied: boolean,
    courtFee: number
    shuttlecockFee: number
    extraFee: number
    modifiedFee: number,
    balance: number
}
// utils/paginationResult.ts

export class PaginationResult<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };

    constructor(data: T[], total: number, page: number, limit: number) {
        this.data = data;
        this.pagination = {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}

export interface BadmintonSessionWaringResponse {
    session: BadmintonSession,
    errors: Partial<Record<'shuttlecockFee' | 'numberShuttlecock', string>>;

}
