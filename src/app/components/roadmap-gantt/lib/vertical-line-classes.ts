import dayjs from 'dayjs';

/**
 * Compose vertical-line CSS classes for a given timeline tick (consumed by
 * `react-calendar-timeline`'s `verticalLineClassNamesForTime`).
 *
 * In day scale we add weekend shading; in either scale we annotate week, month, and
 * the current day with dedicated divider classes.
 */
export function verticalLineClassNamesForTime(startMs: number, isMonthScale: boolean): string[] {
  const date = dayjs(startMs);
  const classes = ['roadmap-day-divider'];
  if (!isMonthScale && (date.day() === 0 || date.day() === 6)) {
    classes.push('roadmap-weekend-shade');
  }
  if (date.day() === 1) classes.push('roadmap-week-divider');
  if (date.date() === 1) classes.push('roadmap-month-divider');
  if (date.isSame(dayjs(), 'day')) classes.push('roadmap-today-divider');
  return classes;
}
