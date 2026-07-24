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

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
}
