export type HistoryPeriod = 'all' | 'day' | 'week' | 'month' | 'year';
const DAY = 86_400_000;
const OFFSET = 330 * 60_000;

export function colomboDate(value = new Date()) {
  return new Date(value.getTime() + OFFSET).toISOString().slice(0, 10);
}

export function historyRange(
  period: HistoryPeriod,
  selectedDate: string,
  now = Date.now(),
) {
  const cutoff = now - 90 * DAY;
  if (period === 'all') return { start: cutoff, end: now + 1 };
  const date = new Date(`${selectedDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return { start: now + 1, end: now + 1 };
  if (period === 'week')
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  if (period === 'month') date.setUTCDate(1);
  if (period === 'year') date.setUTCMonth(0, 1);
  const end = new Date(date);
  if (period === 'day') end.setUTCDate(end.getUTCDate() + 1);
  if (period === 'week') end.setUTCDate(end.getUTCDate() + 7);
  if (period === 'month') end.setUTCMonth(end.getUTCMonth() + 1);
  if (period === 'year') end.setUTCFullYear(end.getUTCFullYear() + 1);
  return {
    start: Math.max(cutoff, date.getTime() - OFFSET),
    end: Math.min(now + 1, end.getTime() - OFFSET),
  };
}
