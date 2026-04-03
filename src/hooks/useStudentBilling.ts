import {useState, useEffect} from 'react';
import {StudentBillingResponse} from "@/types/billing.types.ts";
import studentService from "@/services/api/student.service.ts";

export type PaymentStatus = 'PENDING' | 'OVERDUE' | 'PAID' | 'AWAITING_CONFIRMATION';

export interface MonthlyBilling {
    id: string;
    month: number;
    year: number;
    monthLabel: string;
    classCount: number;
    classValue: number;
    totalValue: number;
    dueDate: Date;
    status: PaymentStatus;
}

export interface StudentBillingData {
    studentName: string;
    contractStartDate: string;
    classRate: number;
    classDays: string[];
    teacherName: string;
    teacherEmail: string;
    teacherPixKey: string;
    billingData: MonthlyBilling[];
    loading: boolean;
    error: string | null;
    updatePaymentStatus: (billingId: string) => Promise<void>;
}

// Mapeia a resposta da API para MonthlyBilling[]
const mapBillingData = (response: StudentBillingResponse): MonthlyBilling[] => {
    return response.monthlyBilling.map(item => ({
        id: item.id,
        month: item.month,
        year: item.year,
        monthLabel: new Date(item.year, item.month - 1).toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric',
        }),
        classCount: item.classCount,
        classValue: item.classValue,
        totalValue: item.totalValue,
        dueDate: new Date(item.dueDate),
        status: item.status,
    }));
};

export const useStudentBilling = (): StudentBillingData => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [billingData, setBillingData] = useState<MonthlyBilling[]>([]);
    const [billingInfo, setBillingInfo] = useState<StudentBillingResponse | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const response = await studentService.getBilling();
                setBillingInfo(response);
                setBillingData(mapBillingData(response));
                setError(null);
            } catch (err) {
                setError('Erro ao carregar dados financeiros');
                console.error('Erro ao carregar dados de cobrança:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Confirma pagamento via PIX e atualiza status local para AWAITING_CONFIRMATION
    const updatePaymentStatus = async (billingId: string): Promise<void> => {
        try {
            const billing = billingData.find(b => b.id === billingId);
            if (!billing || !billingInfo) return;

            await studentService.confirmPayment({
                billingId,
                paymentMethod: 'PIX',
                pixKey: billingInfo.teacherPixKey,
                amount: billing.totalValue,
            });

            // Atualiza estado local de forma otimista
            setBillingData(prev =>
                prev.map(b =>
                    b.id === billingId ? {...b, status: 'AWAITING_CONFIRMATION'} : b,
                ),
            );
        } catch (err) {
            console.error('Erro ao confirmar pagamento:', err);
            throw err;
        }
    };

    return {
        studentName: billingInfo?.studentName ?? '',
        contractStartDate: billingInfo?.contractStartDate ?? '',
        classRate: billingInfo?.classRate ?? 0,
        classDays: [],              // Não retornado pelo endpoint de billing
        teacherName: billingInfo?.teacherName ?? '',
        teacherEmail: billingInfo?.teacherEmail ?? '',
        teacherPixKey: billingInfo?.teacherPixKey ?? '',
        billingData,
        loading,
        error,
        updatePaymentStatus,
    };
};
