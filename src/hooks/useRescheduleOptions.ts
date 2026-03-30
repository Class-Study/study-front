import { useState, useCallback } from 'react';
import { RescheduleOptionResponse } from '@/types/schedule.types';
import scheduleService from '@/services/api/schedule.service';

export function useRescheduleOptions() {
    const [data, setData] = useState<RescheduleOptionResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async (
        scheduleId: string,
        date: string,
        type: string,
    ) => {
        if (!scheduleId || !date || !type) return;

        setLoading(true);
        setData(null);
        setError(null);

        try {
            console.log(`Buscando opções de remarcação para scheduleId=${scheduleId}, date=${date}, type=${type}`);
            const response = await scheduleService.getRescheduleOptions(scheduleId, date, type);
            setData(response);
        } catch (err) {
            console.error('Erro ao buscar opções:', err);
            setError('Não foi possível carregar as opções de remarcação.');
        } finally {
            setLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setData(null);
        setLoading(false);
        setError(null);
    }, []);

    return { data, loading, error, fetch, clear };
}