export type BillingStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'AWAITING_CONFIRMATION';

export interface BillingEntry {
    id: string;
    studentId: string;
    studentName?: string;
    studentAvatarUrl?: string;
    levelProfileName?: string;
    amount: number;
    amountAtBillingTime?: number;
    status: BillingStatus;
    dueDate?: string;
    paidAt?: string;
    notifiedAt?: string;
    notifyCount?: number;
    notes?: string;
    createdAt?: string;
    referenceMonth: string;
    daysOverdue?: number | null;
    hourlyRate?: number;
    classWeekDays?: string[];
    weeksInMonth?: number;
    totalClasses?: number;
    totalAmountCalculated?: number;
    startDate?: string; // Data de início do aluno
}

export interface BillingStats {
    totalMonth: number;
    totalReceived: number;
    totalPending: number;
    totalOverdue: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
}

export interface BillingResponse {
    stats: BillingStats;
    entries: BillingEntry[];
}

export interface BillingMonthResponse {
    stats?: BillingStats;
    entries?: BillingEntry[];
    content?: BillingEntry[];
    totalReceived?: number;
    totalPending?: number;
    totalLate?: number;
    totalExpected?: number;
    paidCount?: number;
    pendingCount?: number;
    lateCount?: number;
    referenceMonth?: string;
    records?: BillingEntry[];
}

export interface BillingPageResponse {
    content: BillingEntry[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
}

export interface StudentPaymentHistory {
    studentId: string;
    studentName: string;
    entries: BillingEntry[];
}

export interface MarkBillingAsPaidPayload {
    paidAt?: string;
    notes?: string;
}

export interface MarkBillingAsPaidResponse {
    id: string;
    status: BillingStatus;
    paidAt?: string;
    updatedAt?: string;
}

// Legacy aliases kept for backward compatibility with old hook/service if referenced elsewhere
export type BillingStatus_Legacy = 'PAID' | 'PENDING' | 'LATE';

export interface BillingRecord {
    id: string;
    studentId: string;
    studentName: string;
    levelProfileName?: string;
    amount: number;
    status: BillingStatus_Legacy;
    paidAt?: string;
    notifyCount: number;
    referenceMonth: string;
}

export interface BillingMonth {
    totalReceived: number;
    totalPending: number;
    totalLate: number;
    totalExpected: number;
    paidCount: number;
    pendingCount: number;
    lateCount: number;
    referenceMonth: string;
    records: BillingRecord[];
}


export interface StudentBillingResponse {
    studentName: string;
    contractStartDate: string;
    contractEndDate: string;
    classRate: number;
    teacherName: string;
    teacherEmail: string;
    teacherPixKey: string;
    monthlyBilling: StudentMonthlyBilling[];
    // Note: Summary removed as per API specification - not exposed to students
}

export interface StudentMonthlyBilling {
    id: string;
    month: number;
    year: number;
    monthYear: string; // '2026-04'
    classCount: number;
    classValue: number;
    totalValue: number;
    dueDate: string; // '2026-05-10'
    status: 'PENDING' | 'OVERDUE' | 'PAID' | 'AWAITING_CONFIRMATION';
}


export interface PaymentConfirmationRequest {
    billingId: string;
    paymentMethod: 'PIX';
    pixKey: string;
    amount: number;
}

export interface PaymentConfirmationResponse {
    success: boolean;
    message: string;
    newStatus: 'AWAITING_CONFIRMATION';
}
