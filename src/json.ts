/** Standalone helpers for JSON handling. */

/** Parse JSON request body and return a key-value map (object). */
export async function parseRequestJsonToMap(request: Request): Promise<Record<string, unknown>> {
	let obj: unknown;
	try {
		obj = await request.json();
	} catch {
		throw new Error('Invalid JSON');
	}
	if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
		throw new Error('JSON must be an object');
	}
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
		out[k] = v;
	}
	return out;
}


