//export const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL;
const raw = (import.meta.env.VITE_BACKEND_URL ?? "").trim().replace(/\/+$/, "");

export const BACKEND_URL =
  /^https?:\/\//i.test(raw)
    ? raw
    : raw.includes("localhost") || raw.startsWith("127.0.0.1")
      ? `http://${raw}`
      : `https://${raw}`;


export class BackendError extends Error {}

// public endpoints

export function ping() {
    return makeRequest("/ping", "GET");
}

// authenticated endpoints

export async function signIn(idToken: string) {
    await makeAuthenticatedRequest(idToken, "/signin", "GET");
}

export async function testAuth(idToken: string): Promise<{ userId: string, token: string }> {
    return (await makeAuthenticatedRequest(idToken, "/test", "GET")).json();
}

async function makeRequest(path: string, method: string, body?: unknown, json = true) {
    if (body) {
        return fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: json ? {
                "Content-Type": "application/json",
            } : {},
            // @ts-expect-error type mismatch
            body: json ? JSON.stringify(body) : body,
        });
    } else {
        return fetch(`${BACKEND_URL}${path}`, {
            method,
        });
    }
}

async function makeAuthenticatedRequest(token: string, path: string, method: string, body?: unknown, json = true) {
    if (!token) {
        throw new BackendError("No id token provided");
    }
    let response;
    if (body) {
        response = await fetch(`${BACKEND_URL}/auth${path}`, {
            method,
            headers: json ? {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            } : {"Authorization": `Bearer ${token}`},
            // @ts-expect-error type mismatch
            body: json ? JSON.stringify(body) : body,
        });
    } else {
        response = await fetch(`${BACKEND_URL}/auth${path}`, {
            method,
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });
    }
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}: ${errorText}`);
        throw new BackendError(errorText);
    }
    return response;
}