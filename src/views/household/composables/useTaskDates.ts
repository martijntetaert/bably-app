import { DateTime } from 'luxon';
import { TaskInterface } from '@/interfaces/TaskInterface';

const LOCALE = 'nl-BE';

export function now(): DateTime {
    return DateTime.now().setLocale(LOCALE);
}

export function today(): string {
    return now().toISODate() ?? '';
}

export function tomorrow(): string {
    return now().plus({ days: 1 }).toISODate() ?? '';
}

/**
 * A due date names a day, not a moment, so it is never shifted into another zone.
 */
export function formatDate(value: string, format: Intl.DateTimeFormatOptions = DateTime.DATE_MED): string {
    return DateTime.fromISO(value).setLocale(LOCALE).toLocaleString(format);
}

export function dueLabel(task: TaskInterface): string | null {
    if (task.overdue) {
        return `Te laat · ${formatDate(task.dueOn, { weekday: 'short', day: 'numeric', month: 'short' })}`;
    }

    if (task.dueOn === today()) {
        return null;
    }

    if (task.dueOn === tomorrow()) {
        return 'Morgen';
    }

    return formatDate(task.dueOn, DateTime.DATE_MED_WITH_WEEKDAY);
}

export function taskMeta(task: TaskInterface): string {
    return [dueLabel(task), task.recurrence.label].filter(Boolean).join(' · ');
}
