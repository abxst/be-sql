import type { AppConfig } from './config';
import { logError } from './error-handler';

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
	const context = { file: 'sql.ts', function: 'executeSqlQuery' };
	
	if (typeof query !== 'string' || query.trim() === '') {
		const error = new Error('Query must be a non-empty string');
		logError(error, { ...context, details: { query: typeof query } });
		throw error;
	}

	const method = options?.method ?? 'POST';
	let response: Response;

	try {
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
	} catch (error) {
		logError(error, { ...context, details: { 
			apiUrl: config.sqlApiUrl.toString(),
			method,
			message: 'Failed to fetch SQL API'
		}});
		throw new Error(`Failed to connect to SQL API: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}

	const text = await response.text();
	let json: PhpSqlResponse;
	try {
		json = JSON.parse(text) as PhpSqlResponse;
	} catch (parseError) {
		logError(parseError, { ...context, details: { 
			responseText: text.substring(0, 200),
			status: response.status,
			message: 'SQL API returned non-JSON response'
		}});
		throw new Error('SQL API returned non-JSON response');
	}

	if (!response.ok) {
		let message = `HTTP ${response.status}`;
		if ('status' in json && json.status === 'error') {
			const errorJson = json as PhpSqlError;
			message = (typeof errorJson.message === 'string' ? errorJson.message : undefined) ?? 'Unknown error';
		} else if ('error' in json) {
			const legacyJson = json as PhpSqlLegacyError;
			message = typeof legacyJson.error === 'string' ? legacyJson.error : 'Unknown error';
		}
		const error = new Error(message);
		logError(error, { ...context, details: { 
			status: response.status,
			query: query.substring(0, 100),
			apiResponse: json
		}});
		throw error;
	}

	if ('status' in json) {
		if (json.status === 'success' && Array.isArray((json as PhpSqlSuccess).data)) {
			return (json as PhpSqlSuccess).data;
		}
		if (json.status === 'error') {
			const errorMsg = (json as PhpSqlError).message ?? 'Unknown error';
			const error = new Error(errorMsg);
			logError(error, { ...context, details: { 
				query: query.substring(0, 100),
				apiResponse: json
			}});
			throw error;
		}
	}

	if ('error' in json) {
		const errorMsg = (json as PhpSqlLegacyError).error;
		const error = new Error(errorMsg);
		logError(error, { ...context, details: { 
			query: query.substring(0, 100),
			apiResponse: json
		}});
		throw error;
	}

	const error = new Error('SQL API returned an unexpected response shape');
	logError(error, { ...context, details: { 
		query: query.substring(0, 100),
		apiResponse: json
	}});
	throw error;
}


