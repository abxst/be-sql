/**
 * Validation utilities for user input
 */

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Validate username
 */
export function validateUsername(username: unknown): ValidationResult {
	const errors: string[] = [];

	// Check if string
	if (typeof username !== 'string') {
		errors.push('Username must be a string');
		return { valid: false, errors };
	}

	// Check not empty
	if (username.trim().length === 0) {
		errors.push('Username cannot be empty');
	}

	// Check length (3-50 characters)
	if (username.length < 3) {
		errors.push('Username must be at least 3 characters');
	}
	if (username.length > 50) {
		errors.push('Username must not exceed 50 characters');
	}

	// Check valid characters (alphanumeric, underscore, dash)
	const usernameRegex = /^[a-zA-Z0-9_-]+$/;
	if (!usernameRegex.test(username)) {
		errors.push('Username can only contain letters, numbers, underscore and dash');
	}

	// Check doesn't start with number or special char
	if (username.length > 0 && !/^[a-zA-Z]/.test(username)) {
		errors.push('Username must start with a letter');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Validate password
 */
export function validatePassword(password: unknown): ValidationResult {
	const errors: string[] = [];

	// Check if string
	if (typeof password !== 'string') {
		errors.push('Password must be a string');
		return { valid: false, errors };
	}

	// Check not empty
	if (password.length === 0) {
		errors.push('Password cannot be empty');
	}

	// Check minimum length
	if (password.length < 6) {
		errors.push('Password must be at least 6 characters');
	}

	// Check maximum length
	if (password.length > 128) {
		errors.push('Password must not exceed 128 characters');
	}

	// Check contains at least one letter
	if (!/[a-zA-Z]/.test(password)) {
		errors.push('Password must contain at least one letter');
	}

	// Check contains at least one number
	if (!/[0-9]/.test(password)) {
		errors.push('Password must contain at least one number');
	}

	// Optional: Check for common weak passwords
	const weakPasswords = ['123456', 'password', 'qwerty', '123456789', '12345678'];
	if (weakPasswords.includes(password.toLowerCase())) {
		errors.push('Password is too weak, please choose a stronger password');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Validate prefix
 */
export function validatePrefix(prefix: unknown): ValidationResult {
	const errors: string[] = [];

	// Check if string
	if (typeof prefix !== 'string') {
		errors.push('Prefix must be a string');
		return { valid: false, errors };
	}

	// Check not empty
	if (prefix.trim().length === 0) {
		errors.push('Prefix cannot be empty');
	}

	// Check length (2-20 characters)
	if (prefix.length < 2) {
		errors.push('Prefix must be at least 2 characters');
	}
	if (prefix.length > 20) {
		errors.push('Prefix must not exceed 20 characters');
	}

	// Check valid characters (alphanumeric, underscore)
	const prefixRegex = /^[a-zA-Z0-9_]+$/;
	if (!prefixRegex.test(prefix)) {
		errors.push('Prefix can only contain letters, numbers and underscore');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Sanitize input string to prevent XSS
 */
export function sanitizeInput(input: string): string {
	return input
		.trim()
		.replace(/[<>]/g, '') // Remove < and >
		.substring(0, 200); // Limit length
}

/**
 * Check if string contains SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
	const sqlPatterns = [
		/(\bor\b|\band\b).*?=.*?=/i,        // OR/AND with equals
		/union.*?select/i,                   // UNION SELECT
		/insert.*?into/i,                    // INSERT INTO
		/delete.*?from/i,                    // DELETE FROM
		/drop.*?(table|database)/i,          // DROP TABLE/DATABASE
		/update.*?set/i,                     // UPDATE SET
		/exec(ute)?.*?\(/i,                  // EXEC/EXECUTE
		/script.*?>/i,                       // Script tags
		/--/,                                 // SQL comments
		/\/\*/,                              // Multi-line comments
		/;.*?(drop|delete|insert|update)/i  // Semicolon followed by dangerous keywords
	];

	return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate email format
 */
export function validateEmail(email: unknown): ValidationResult {
	const errors: string[] = [];

	if (typeof email !== 'string') {
		errors.push('Email must be a string');
		return { valid: false, errors };
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		errors.push('Invalid email format');
	}

	if (email.length > 100) {
		errors.push('Email must not exceed 100 characters');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

