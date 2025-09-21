/** Helpers to read data from a Request in Cloudflare Workers. */

export interface RequestSummaryBody {
	readonly kind: 'json' | 'form' | 'text' | 'none';
	readonly value?: unknown;
}

export interface RequestSummary {
	readonly method: string;
	readonly url: string;
	readonly query: Record<string, string>;
	readonly headers: Record<string, string>;
	readonly contentType?: string;
	readonly body: RequestSummaryBody;
}

/** Extract 'query' from GET ?query=..., POST JSON {query}, URL-encoded or multipart form, or raw text body. */
export async function extractQueryFromRequest(request: Request): Promise<string | undefined> {
	const url = new URL(request.url);
	const fromSearch = url.searchParams.get('query');
	if (fromSearch && fromSearch.trim() !== '') return fromSearch;

	const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
	try {
		if (contentType.includes('application/json')) {
			const data = (await request.json()) as unknown;
			if (data && typeof (data as any).query === 'string' && (data as any).query.trim() !== '') {
				return (data as any).query as string;
			}
		} else if (
			contentType.includes('application/x-www-form-urlencoded') ||
			contentType.includes('multipart/form-data')
		) {
			const form = await request.formData();
			const v = form.get('query');
			if (typeof v === 'string' && v.trim() !== '') return v;
		} else if (contentType.startsWith('text/')) {
			const text = await request.text();
			if (text.trim() !== '') return text;
		}
	} catch {
		// Ignore body parsing errors; return undefined
	}
	return undefined;
}

/** Read request data for debugging/demo purposes. Consumes the body stream once. */
export async function summarizeRequest(request: Request): Promise<RequestSummary> {
	const url = new URL(request.url);
	const query: Record<string, string> = {};
	for (const [k, v] of url.searchParams.entries()) query[k] = v;

	const headers: Record<string, string> = {};
	for (const [k, v] of request.headers.entries()) headers[k] = v;

	const contentType = headers['content-type']?.toLowerCase();
	let body: RequestSummaryBody = { kind: 'none' };

	try {
		if (contentType?.includes('application/json')) {
			body = { kind: 'json', value: await request.json() };
		} else if (
			contentType?.includes('application/x-www-form-urlencoded') ||
			contentType?.includes('multipart/form-data')
		) {
			const form = await request.formData();
			const obj: Record<string, unknown> = {};
			for (const [k, v] of form.entries()) obj[k] = v;
			body = { kind: 'form', value: obj };
		} else if (contentType?.startsWith('text/')) {
			body = { kind: 'text', value: await request.text() };
		} else {
			body = { kind: 'none' };
		}
	} catch {
		body = { kind: 'none' };
	}

	return {
		method: request.method,
		url: request.url,
		query,
		headers,
		contentType,
		body,
	};
}

/** Parse JSON body and normalize into a key-value map (object). */
export async function parseJsonToMap(request: Request): Promise<Record<string, unknown>> {
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


