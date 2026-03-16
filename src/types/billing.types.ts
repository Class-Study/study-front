export type BillingStatus = 'PAID' | 'PENDING' | 'OVERDUE';

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
