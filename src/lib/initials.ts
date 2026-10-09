function initialOf(name: string): string {
    return Array.from(name)[0] ?? '';
}

export function getInitials(fullName?: string): string {
    const names = (fullName ?? '').trim().split(/\s+/u).filter(Boolean);

    if (names.length === 0) {
        return '';
    }

    if (names.length === 1) {
        return initialOf(names[0]).toUpperCase();
    }

    return `${initialOf(names[0])}${initialOf(names[names.length - 1])}`.toUpperCase();
}
