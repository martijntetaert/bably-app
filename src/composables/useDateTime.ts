import { DateTime, DateTimeFormatOptions } from 'luxon';

const LOCALE = 'nl-BE';

export type UseDateTimeReturn = {
    now: () => DateTime;
    currentZone: () => string;
    formatDate: (value: string, format?: DateTimeFormatOptions) => string;
    formatDateTime: (value: string, format?: DateTimeFormatOptions) => string;
    formatTime: (value: string) => string;
    formatRelative: (value: string) => string;
};

export function now(): DateTime {
    return DateTime.now().setLocale(LOCALE);
}

export function currentZone(): string {
    return DateTime.local().zoneName;
}

/**
 * A calendar date names a day, not a moment, so it is never shifted into another zone.
 */
export function formatDate(
    value: string,
    format: DateTimeFormatOptions = DateTime.DATE_MED,
): string {
    return DateTime.fromISO(value).setLocale(LOCALE).toLocaleString(format);
}

export function formatDateTime(
    value: string,
    format: DateTimeFormatOptions = DateTime.DATETIME_MED,
): string {
    return toLocal(value).toLocaleString(format);
}

export function formatTime(value: string): string {
    return toLocal(value).toLocaleString(DateTime.TIME_SIMPLE);
}

export function formatRelative(value: string): string {
    return toLocal(value).toRelative() ?? '';
}

function toLocal(value: string): DateTime {
    return DateTime.fromISO(value, { zone: 'utc' })
        .setZone('local')
        .setLocale(LOCALE);
}

export function useDateTime(): UseDateTimeReturn {
    return {
        now,
        currentZone,
        formatDate,
        formatDateTime,
        formatTime,
        formatRelative,
    };
}
