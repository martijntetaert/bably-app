import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'bably.token';

export const apiUrl = (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public errors: Record<string, string[]> = {},
        public code: string | null = null,
    ) {
        super(message);
    }

    /**
     * The household has no Plus for this; the paywall explains it, so no toast is needed.
     */
    get isPlusRequired(): boolean {
        return this.status === 402 && this.code === 'plus_required';
    }

    firstError(field: string): string | null {
        return this.errors[field]?.[0] ?? null;
    }

    get isOffline(): boolean {
        return this.status === 0;
    }
}

type Unauthenticated = () => void;
type PlusRequired = () => void;

let token: string | null = null;
let onUnauthenticated: Unauthenticated = () => {};
let onPlusRequired: PlusRequired = () => {};

export async function loadToken(): Promise<string | null> {
    token = (await Preferences.get({ key: TOKEN_KEY })).value;

    return token;
}

export async function storeToken(value: string | null): Promise<void> {
    token = value;

    if (value === null) {
        await Preferences.remove({ key: TOKEN_KEY });
    } else {
        await Preferences.set({ key: TOKEN_KEY, value });
    }
}

export function whenUnauthenticated(callback: Unauthenticated): void {
    onUnauthenticated = callback;
}

export function whenPlusRequired(callback: PlusRequired): void {
    onPlusRequired = callback;
}

type Body = Record<string, unknown> | FormData | undefined;

export async function request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: Body): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (token !== null) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (body !== undefined && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    let response: Response;

    try {
        response = await fetch(`${apiUrl}/api/v1/${path}`, {
            method,
            headers,
            body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(0, 'Geen verbinding. Probeer het zo meteen opnieuw.');
    }

    if (response.status === 204) {
        return undefined as T;
    }

    const payload = await response.json().catch(() => ({}));

    if (response.ok) {
        return payload as T;
    }

    if (response.status === 401 && token !== null) {
        await storeToken(null);
        onUnauthenticated();
    }

    const error = new ApiError(
        response.status,
        payload.message ?? 'Er ging iets mis. Probeer het opnieuw.',
        payload.errors ?? {},
        payload.code ?? null,
    );

    if (error.isPlusRequired) {
        onPlusRequired();
    }

    throw error;
}

/**
 * A file upload goes as multipart; PHP only reads multipart on POST, so a change is
 * spoofed with _method.
 */
export function formData(fields: Record<string, unknown>, method?: 'PATCH'): FormData {
    const data = new FormData();

    if (method !== undefined) {
        data.append('_method', method);
    }

    const append = (key: string, value: unknown): void => {
        if (value === undefined || value === null) {
            return;
        }

        if (value instanceof Blob) {
            data.append(key, value, 'photo.jpg');
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => append(`${key}[${index}]`, item));
        } else if (typeof value === 'object') {
            Object.entries(value as Record<string, unknown>).forEach(([child, item]) => append(`${key}[${child}]`, item));
        } else if (typeof value === 'boolean') {
            data.append(key, value ? '1' : '0');
        } else {
            data.append(key, String(value));
        }
    };

    Object.entries(fields).forEach(([key, value]) => append(key, value));

    return data;
}
