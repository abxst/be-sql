/** Simple AES-GCM cookie encryption utilities for Workers */

export interface SessionPayload {
	username: string;
	prefix: string;
}

async function importAesKey(secret: string): Promise<CryptoKey> {
	const enc = new TextEncoder();
	const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret));
	return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptSessionToken(env: Env, payload: SessionPayload, ttlSeconds = 60 * 60 * 24 * 7): Promise<string> {
	const key = await importAesKey(env.SESSION_SECRET);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const enc = new TextEncoder();
	const plaintext = enc.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
	const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
	const token = base64urlConcat(iv, ciphertext);
	return token;
}

export async function decryptSessionToken(env: Env, token: string): Promise<SessionPayload | null> {
	try {
		const key = await importAesKey(env.SESSION_SECRET);
		const { iv, ciphertext } = base64urlSplit(token);
		const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext));
		const dec = new TextDecoder();
		const obj = JSON.parse(dec.decode(plaintext)) as { username: string; prefix: string; exp?: number };
		if (typeof obj.exp === 'number' && obj.exp < Math.floor(Date.now() / 1000)) return null;
		return { username: obj.username, prefix: obj.prefix };
	} catch {
		return null;
	}
}

function base64urlConcat(iv: Uint8Array, ciphertext: Uint8Array): string {
	const combined = new Uint8Array(iv.length + ciphertext.length);
	combined.set(iv, 0);
	combined.set(ciphertext, iv.length);
	return toBase64Url(combined);
}

function base64urlSplit(token: string): { iv: Uint8Array; ciphertext: Uint8Array } {
	const bytes = fromBase64Url(token);
	const iv = bytes.slice(0, 12);
	const ciphertext = bytes.slice(12);
	return { iv, ciphertext };
}

function toBase64Url(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	const b64 = btoa(bin);
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(b64url: string): Uint8Array {
	const pad = b64url.length % 4 === 2 ? '==' : b64url.length % 4 === 3 ? '=' : '';
	const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad;
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

export async function readSession(env: Env, request: Request): Promise<SessionPayload | null> {
	const auth = request.headers.get('Authorization');
	if (!auth || !auth.startsWith('Bearer ')) return null;
	const token = auth.substring(7).trim();
	if (!token) return null;
	return decryptSessionToken(env, token);
}


