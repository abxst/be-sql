/**
 * Centralized error codes system
 * Format: 0xXYZ where X = category, YZ = specific error
 */

export const ErrorCodes = {
	// Authentication errors (0x001 - 0x0FF)
	UNAUTHORIZED: '0x001',
	INVALID_CREDENTIALS: '0x002',
	SESSION_EXPIRED: '0x003',
	SESSION_INVALID: '0x004',
	
	// Validation errors (0x100 - 0x1FF)
	MISSING_FIELDS: '0x100',
	INVALID_USERNAME: '0x101',
	INVALID_PASSWORD: '0x102',
	INVALID_PREFIX: '0x103',
	SQL_INJECTION_DETECTED: '0x104',
	INVALID_FIELD_TYPE: '0x105',
	INVALID_AMOUNT_VALUE: '0x106',
	INVALID_LENGTH_VALUE: '0x107',
	USERNAME_VALIDATION_FAILED: '0x108',
	PASSWORD_VALIDATION_FAILED: '0x109',
	PREFIX_VALIDATION_FAILED: '0x10A',
	INVALID_EMAIL: '0x10B',
	PASSWORD_TOO_LONG: '0x10C',
	INVALID_KEY_TYPE: '0x10D',
	
	// Database errors (0x200 - 0x2FF)
	SQL_QUERY_FAILED: '0x200',
	DATABASE_CONNECTION_FAILED: '0x201',
	INSERT_FAILED: '0x202',
	UPDATE_FAILED: '0x203',
	DELETE_FAILED: '0x204',
	QUERY_TIMEOUT: '0x205',
	
	// Request parsing errors (0x300 - 0x3FF)
	JSON_PARSE_ERROR: '0x300',
	INVALID_CONTENT_TYPE: '0x301',
	INVALID_REQUEST_FORMAT: '0x302',
	REQUEST_BODY_TOO_LARGE: '0x303',
	
	// Internal server errors (0x400 - 0x4FF)
	UNKNOWN_ERROR: '0x400',
	CONFIGURATION_ERROR: '0x401',
	ENCRYPTION_ERROR: '0x402',
	DECRYPTION_ERROR: '0x403',
	
	// Resource errors (0x500 - 0x5FF)
	NOT_FOUND: '0x500',
	RESOURCE_NOT_FOUND: '0x501',
	USER_NOT_FOUND: '0x502',
	KEY_NOT_FOUND: '0x503',
	
	// Rate limiting & quota errors (0x600 - 0x6FF)
	RATE_LIMIT_EXCEEDED: '0x600',
	QUOTA_EXCEEDED: '0x601',
	TOO_MANY_REQUESTS: '0x602',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Get human-readable description for error code
 */
export function getErrorDescription(code: ErrorCode): string {
	const descriptions: Record<ErrorCode, string> = {
		// Authentication
		'0x001': 'Unauthorized access',
		'0x002': 'Invalid credentials provided',
		'0x003': 'Session has expired',
		'0x004': 'Invalid session token',
		
		// Validation
		'0x100': 'Required fields are missing',
		'0x101': 'Username format is invalid',
		'0x102': 'Password format is invalid',
		'0x103': 'Prefix format is invalid',
		'0x104': 'SQL injection attempt detected',
		'0x105': 'Field has invalid type',
		'0x106': 'Amount value is out of range',
		'0x107': 'Length value is out of range',
		'0x108': 'Username validation failed',
		'0x109': 'Password validation failed',
		'0x10A': 'Prefix validation failed',
		'0x10B': 'Email format is invalid',
		'0x10C': 'Password exceeds maximum length',
		'0x10D': 'Key type is invalid',
		
		// Database
		'0x200': 'SQL query execution failed',
		'0x201': 'Database connection failed',
		'0x202': 'Failed to insert record',
		'0x203': 'Failed to update record',
		'0x204': 'Failed to delete record',
		'0x205': 'Query execution timed out',
		
		// Request parsing
		'0x300': 'Failed to parse JSON request',
		'0x301': 'Invalid content type',
		'0x302': 'Request format is invalid',
		'0x303': 'Request body exceeds size limit',
		
		// Internal
		'0x400': 'Unknown internal error',
		'0x401': 'Server configuration error',
		'0x402': 'Encryption operation failed',
		'0x403': 'Decryption operation failed',
		
		// Resources
		'0x500': 'Resource not found',
		'0x501': 'Requested resource does not exist',
		'0x502': 'User not found',
		'0x503': 'Key not found',
		
		// Rate limiting
		'0x600': 'Rate limit exceeded',
		'0x601': 'Quota limit exceeded',
		'0x602': 'Too many requests',
	};
	
	return descriptions[code] || 'Unknown error';
}

/**
 * Get HTTP status code for error code
 */
export function getHttpStatusForErrorCode(code: ErrorCode): number {
	// Authentication errors -> 401
	if (code >= '0x001' && code <= '0x0FF') {
		return 401;
	}
	
	// Validation errors -> 400
	if (code >= '0x100' && code <= '0x1FF') {
		return 400;
	}
	
	// Database errors -> 502
	if (code >= '0x200' && code <= '0x2FF') {
		return 502;
	}
	
	// Request parsing errors -> 400
	if (code >= '0x300' && code <= '0x3FF') {
		return 400;
	}
	
	// Internal errors -> 500
	if (code >= '0x400' && code <= '0x4FF') {
		return 500;
	}
	
	// Resource errors -> 404
	if (code >= '0x500' && code <= '0x5FF') {
		return 404;
	}
	
	// Rate limiting -> 429
	if (code >= '0x600' && code <= '0x6FF') {
		return 429;
	}
	
	return 500; // Default to 500 for unknown codes
}

