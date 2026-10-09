export interface FoundDuration {
    label: string;
    seconds: number;
}

const UNITS: Record<string, number> = {
    seconde: 1,
    seconden: 1,
    sec: 1,
    s: 1,
    minuut: 60,
    minuutje: 60,
    minuutjes: 60,
    minuten: 60,
    min: 60,
    uur: 3600,
    uren: 3600,
    u: 3600,
};

const WORDS: [RegExp, number][] = [
    [/\banderhalf uur\b/i, 5400],
    [/\b(?:een )?half uur(tje)?\b/i, 1800],
    [/\b(?:een )?kwartier(tje)?\b/i, 900],
];

// "15 minuten", "10-12 min", "10 à 12 minuten", "1,5 uur", "30 sec".
const NUMBERED =
    /(\d+(?:[,.]\d+)?)(?:\s*(?:-|–|à|a|tot)\s*(\d+(?:[,.]\d+)?))?\s*(seconden|seconde|sec|s|minuutjes|minuutje|minuten|minuut|min|uren|uur|u)\b/gi;

const toNumber = (value: string): number => Number(value.replace(',', '.'));

export const formatDuration = (seconds: number): string => {
    if (seconds >= 3600) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.round((seconds % 3600) / 60);

        return minutes === 0 ? `${hours} u` : `${hours} u ${minutes} min`;
    }

    if (seconds >= 60) {
        return `${Math.round(seconds / 60)} min`;
    }

    return `${seconds} sec`;
};

/**
 * The times a step mentions. A range counts as its upper end: it is safer to check at ten
 * minutes than to find it burnt at twelve.
 */
export const findDurations = (step: string): FoundDuration[] => {
    const seconds: number[] = [];

    for (const match of step.matchAll(NUMBERED)) {
        const amount = toNumber(match[2] ?? match[1]);
        const unit = UNITS[match[3].toLowerCase()];

        if (amount > 0 && unit) {
            seconds.push(Math.round(amount * unit));
        }
    }

    WORDS.forEach(([pattern, value]) => {
        if (pattern.test(step)) {
            seconds.push(value);
        }
    });

    return [...new Set(seconds)].map((value) => ({ label: formatDuration(value), seconds: value }));
};

export const formatRemaining = (milliseconds: number): string => {
    const total = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, '0');

    return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
};
