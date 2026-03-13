export type BillingStatus = 'PAID' | 'PENDING' | 'LATE';

export interface BillingRecord {
  id: string;
  studentId: string;
  studentName: string;
  levelProfileName?: string;
  amount: number;
  status: BillingStatus;
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
