export const CLASS_DAY_LABEL: Record<string, string> = {
  MONDAY:    'Seg',
  TUESDAY:   'Ter',
  WEDNESDAY: 'Qua',
  THURSDAY:  'Qui',
  FRIDAY:    'Sex',
  SATURDAY:  'Sáb',
  SUNDAY:    'Dom',
};

export const formatClassDays = (days: string[]): string =>
  days.map(d => CLASS_DAY_LABEL[d] ?? d).join(', ');

export const formatClassTime = (time: string): string =>
  time.substring(0, 5); // "19:00:00" → "19:00"

// Para o filtro de dias — retorna o valor em inglês dado o label PT
export const DAY_FILTER_OPTIONS = [
  { label: 'Todos',  value: 'ALL' },
  { label: 'Dom',    value: 'SUNDAY' },
  { label: 'Seg',    value: 'MONDAY' },
  { label: 'Ter',    value: 'TUESDAY' },
  { label: 'Qua',    value: 'WEDNESDAY' },
  { label: 'Qui',    value: 'THURSDAY' },
  { label: 'Sex',    value: 'FRIDAY' },
  { label: 'Sáb',    value: 'SATURDAY' },
];
