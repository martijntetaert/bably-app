/**
 * Google bills a place search per session: the suggestions while typing and the store that
 * is saved afterwards share one token. randomUUID only exists from iOS 15.4.
 */
export function newSessionToken(): string {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
