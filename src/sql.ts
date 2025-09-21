import type { AppConfig } from './config';

export interface ExecuteSqlOptions {
	readonly signal?: AbortSignal;
	/** Default: 'POST'. When 'GET', the query is sent as a query string param. */
	readonly method?: 'POST' | 'GET';
}

type Row = Record<string, unknown>;

interface PhpSqlSuccess {
	status: 'success';
	data: Row[];
}

interface PhpSqlError {
	status: 'error';
	message?: string;
	[key: string]: unknown;
}

interface PhpSqlLegacyError {
	error: string;
	[key: string]: unknown;
}

type PhpSqlResponse = PhpSqlSuccess | PhpSqlError | PhpSqlLegacyError;

/**
 * Execute a raw SQL query by forwarding it to the PHP endpoint.
 * The endpoint is configured via `URL_API_SQL` and should accept either
 * POST JSON `{ query: string }` or GET `?query=...` as shown in the provided PHP code.
 *
 * Returns the `data` array on success. Throws on any error or unexpected response.
 */
export async function executeSqlQuery(config: AppConfig, query: string, options?: ExecuteSqlOptions): Promise<Row[]> {
	if (typeof query !== 'string' || query.trim() === '') {
		throw new Error('Query must be a non-empty string');
	}

	const method = options?.method ?? 'POST';
	let response: Response;

	if (method === 'GET') {
		const url = new URL(config.sqlApiUrl);
		url.searchParams.set('query', query);
		response = await fetch(url.toString(), { method: 'GET', signal: options?.signal });
	} else {
		response = await fetch(config.sqlApiUrl, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ query }),
			signal: options?.signal,
		});
	}

	const text = await response.text();
	let json: PhpSqlResponse;
	try {
		json = JSON.parse(text) as PhpSqlResponse;
	} catch {
		throw new Error('SQL API returned non-JSON response');
	}

	if (!response.ok) {
		const message = 'status' in json && json.status === 'error' ? (json.message ?? 'Unknown error') : ('error' in json ? json.error : `HTTP ${response.status}`);
		throw new Error(`SQL API error: ${message}`);
	}

	if ('status' in json) {
		if (json.status === 'success' && Array.isArray((json as PhpSqlSuccess).data)) {
			return (json as PhpSqlSuccess).data;
		}
		if (json.status === 'error') {
			throw new Error(`SQL API error: ${(json as PhpSqlError).message ?? 'Unknown error'}`);
		}
	}

	if ('error' in json) {
		throw new Error(`SQL API error: ${(json as PhpSqlLegacyError).error}`);
	}

	throw new Error('SQL API returned an unexpected response shape');
}


