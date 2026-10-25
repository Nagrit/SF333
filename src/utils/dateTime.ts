
import { getCalendars, getLocales } from 'expo-localization';

const deviceLocale = getLocales()[0]?.languageTag ?? 'en-US';
const deviceCalendar = getCalendars()[0];

export const uses24HourClock =
  deviceCalendar?.uses24hourClock ?? false;

export function formatDeviceDate(date: Date) {
  return new Intl.DateTimeFormat(deviceLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDeviceTime(date: Date) {
  return new Intl.DateTimeFormat(deviceLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !uses24HourClock,
  }).format(date);
}

// ใช้ค่ามาตรฐานสำหรับ API แทนข้อความวันที่ภาษาไทย
export function toApiDateTime(date: Date) {
  return date.toISOString();
}

// รวมวันที่กับเวลา โดยรักษาวันและเวลาท้องถิ่น
export function combineLocalDateAndTime(
  date: Date,
  time: Date,
): Date {
  const result = new Date(date);

  result.setHours(
    time.getHours(),
    time.getMinutes(),
    0,
    0,
  );

  return result;
}
