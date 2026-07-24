import { format, formatDistanceToNow, parseISO, isToday, isTomorrow } from 'date-fns';
import { KENYAN_CURRENCY } from '../constants';

export function formatCurrency(amount: number): string {
  return `${KENYAN_CURRENCY} ${amount.toLocaleString()}`;
}

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, d MMM');
}

export function formatTime(timeStr: string): string {
  // Accepts HH:mm or full ISO
  if (timeStr.includes('T')) {
    return format(parseISO(timeStr), 'h:mm a');
  }
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function formatPhone(phone: string): string {
  if (phone.startsWith('+254')) {
    return `+254 ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }
  return phone;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatSeats(available: number, total: number): string {
  return `${available}/${total}`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/** Word-based truncation for feed text. Returns whether it was clipped. */
export function truncateWords(
  text: string,
  maxWords: number,
): { text: string; truncated: boolean } {
  const clean = text.trim();
  const words = clean.split(/\s+/);
  if (words.length <= maxWords) return { text: clean, truncated: false };
  return { text: words.slice(0, maxWords).join(' ') + '…', truncated: true };
}

/**
 * Compact, uniform relative time — "now", "36m ago", "4h ago", "2d ago".
 * Avoids date-fns' inconsistent "about an hour ago" phrasing.
 */
export function formatShortRelativeTime(dateStr: string): string {
  const date = parseISO(dateStr);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return format(date, 'd MMM');
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
}
