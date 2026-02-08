export interface BadmintonSessionRequest {
    courtType: 'fixed' | 'casual'
    dateList: Date[];
    startTime: string,
    endTime: string,
    location: string;
    courtFee: number;
    shuttlecockFee: number;
    participants: ParticipantRequest[];
    extraFee: number
    note?: string;
    groupId: string
    numberShuttlecock: number
}

export interface SubParticipant {
    name: string;
    isCourtFeeApplied: boolean;
    isShuttlecockFeeApplied: boolean;
    isExtraFeeApplied: boolean;
    courtFee: number;
    shuttlecockFee: number;
    extraFee: number;
}

export interface ParticipantRequest {
    memberId: string
    isCourtFeeApplied: boolean
    isShuttlecockFeeApplied: boolean,
    isExtraFeeApplied: boolean,
    courtFee: number
    shuttlecockFee: number
    extraFee: number
    modifiedFee: number
    participants: SubParticipant[]
}


export interface ShuttlecockFeeRequest {
    groupId: string
    shuttlecockFee: number
    numberShuttlecock: number
}

