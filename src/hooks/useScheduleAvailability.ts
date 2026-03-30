import {useState, useCallback} from 'react';
import {ClassDay} from '@/types/student.types';
import {DayAvailability} from '@/types/schedule.types';
import studentService from '@/services/api/student.service';

export interface AvailabilityResult {
    [day: string]: DayAvailability;
}

export function useScheduleAvailability() {
    const [result, setResult] = useState<AvailabilityResult>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const check = useCallback(async (
        days: ClassDay[],
        durationMin: number,
        startDate: string,
        classTime: string,
        contractMonths: number,
    ) => {
        if (!days.length || !startDate || !durationMin) return;

        // Marca os dias como loading
        setLoading(prev => {
            const next = {...prev};
            days.forEach(d => {
                next[d] = true;
            });
            return next;
        });

        try {
            const availability = await studentService.checkAvailability(
                days,
                durationMin,
                startDate,
                classTime,
                contractMonths,
            );

            setResult(prev => {
                const next = {...prev};
                availability.forEach(dayAvail => {
                    next[dayAvail.day] = dayAvail;
                });
                return next;
            });
        } finally {
            setLoading(prev => {
                const next = {...prev};
                days.forEach(d => {
                    next[d] = false;
                });
                return next;
            });
        }
    }, []);

    const clearDay = useCallback((day: ClassDay) => {
        setResult(prev => {
            const next = {...prev};
            delete next[day];
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        setResult({});
        setLoading({});
    }, []);

    return {result, loading, check, clearDay, clearAll};
}