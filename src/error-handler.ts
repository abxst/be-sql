/**
 * Centralized error handling utilities
 */

export interface ErrorContext {
	file: string;
	function: string;
	details?: Record<string, any>;
	env?: Env;
}

/**
 * Check if debug mode is enabled
 */
function isDebugEnabled(env?: Env): boolean {
	if (!env) return true; // Default to true if env not available
	const isDebug = env.IS_DEBUG;
	// Default to true if not set
	if (isDebug === undefined || isDebug === null || isDebug === '') return true;
	// Check for truthy values
	return isDebug === 'true' || isDebug === '1' || isDebug === 'yes';
}

/**
 * Log error with detailed context
 * Errors are ALWAYS logged regardless of debug mode
 */
export function logError(error: unknown, context: ErrorContext): void {
	const errorInfo = {
		timestamp: new Date().toISOString(),
		file: context.file,
		function: context.function,
		error: {
			message: error instanceof Error ? error.message : String(error),
			name: error instanceof Error ? error.name : 'UnknownError',
			stack: error instanceof Error ? error.stack : undefined,
		},
		details: context.details || {},
	};

	// Errors are always logged
	console.error('[ERROR]', JSON.stringify(errorInfo, null, 2));
}

/**
 * Log info message (only in debug mode)
 */
export function logInfo(message: string, data?: any, env?: Env): void {
	if (isDebugEnabled(env)) {
		if (data) {
			console.log(`[INFO] ${message}`, JSON.stringify(data));
		} else {
			console.log(`[INFO] ${message}`);
		}
	}
}

/**
 * Log debug message (only in debug mode)
 */
export function logDebug(message: string, data?: any, env?: Env): void {
	if (isDebugEnabled(env)) {
		if (data) {
			console.log(`[DEBUG] ${message}`, JSON.stringify(data));
		} else {
			console.log(`[DEBUG] ${message}`);
		}
	}
}

/**
 * Create a JSON error response with detailed information
 * In production (IS_DEBUG=false), only returns basic error message
 * In development (IS_DEBUG=true), returns full context and details
 */
export function createErrorResponse(
	error: unknown,
	context: ErrorContext,
	statusCode: number = 500
): Response {
	logError(error, context);

	const errorMessage = error instanceof Error ? error.message : String(error);
	const debugEnabled = isDebugEnabled(context.env);
	
	let responseBody: any;
	
	if (debugEnabled) {
		// Development: Full error details
		responseBody = {
			status: 'error',
			error: errorMessage,
			context: {
				file: context.file,
				function: context.function,
				timestamp: new Date().toISOString(),
			},
			...(context.details && { details: context.details }),
		};
	} else {
		// Production: Basic error message only
		const genericMessages: Record<number, string> = {
			400: 'Bad Request',
			401: 'Unauthorized',
			403: 'Forbidden',
			404: 'Not Found',
			500: 'Internal Server Error',
			502: 'Bad Gateway',
			503: 'Service Unavailable',
		};
		
		responseBody = {
			status: 'error',
			error: genericMessages[statusCode] || 'An error occurred',
		};
	}

	return new Response(JSON.stringify(responseBody, null, 2), {
		status: statusCode,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
}

/**
 * Wrapper to catch errors in async route handlers
 */
export function catchErrors(
	handler: (request: Request, env: Env) => Promise<Response>,
	context: ErrorContext
): (request: Request, env: Env) => Promise<Response> {
	return async (request: Request, env: Env): Promise<Response> => {
		try {
			return await handler(request, env);
		} catch (error) {
			return createErrorResponse(error, context, 500);
		}
	};
}

