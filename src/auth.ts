/** Simple AES-GCM cookie encryption utilities for Workers */

export interface SessionPayload {
	username: string;
	prefix: string;
}

// Temporarily disable encryption for debugging
export async function encryptSessionCookie(env: Env, payload: SessionPayload, ttlSeconds = 60 * 60 * 24): Promise<string> {
	const expPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
	const plaintext = JSON.stringify(expPayload);
	const token = btoa(plaintext); // Use base64 instead of encryption
	return token;
}

export async function decryptSessionCookie(env: Env, token: string): Promise<SessionPayload | null> {
	try {
		const plaintext = atob(token); // Decode base64
		const obj = JSON.parse(plaintext) as { username: string; prefix: string; exp?: number };
		if (typeof obj.exp === 'number' && obj.exp < Math.floor(Date.now() / 1000)) return null;
		return { username: obj.username, prefix: obj.prefix };
	} catch {
		return null;
	}
}

export function getCookie(request: Request, name: string): string | null {
	const cookie = request.headers.get('cookie');
	if (!cookie) return null;
	const parts = cookie.split(/;\s*/);
	for (const part of parts) {
		const idx = part.indexOf('=');
		if (idx === -1) continue;
		const k = part.slice(0, idx).trim();
		const v = part.slice(idx + 1).trim();
		if (k === name) return v;
	}
	return null;
}

export async function readSessionFromRequest(env: Env, request: Request): Promise<SessionPayload | null> {
	console.log('Cookie header:', request.headers.get('cookie'));
	const token = getCookie(request, 'session');
	console.log('Extracted session token:', token);
	if (!token) return null;
	return decryptSessionCookie(env, token);
}

// Ensure buildSetCookie is complete
export function buildSetCookie(name: string, value: string, maxAgeSeconds: number): string {
	const attrs = [
		`${name}=${value}`,
		`Path=/`,
		`HttpOnly`,
		`SameSite=Lax`,
		`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
		`Secure`,
	];
	return attrs.join('; ');
}