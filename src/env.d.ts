/* App-specific Env augmentations. Keep in sync with wrangler bindings.
 * After updating, run `npm run cf-typegen` to regenerate base types as needed.
 */

export { };

declare global {
	interface Env {
		/** Base URL for the SQL API (e.g., https://api.example.com/sql) */
		URL_API_SQL: string;
		/** Secret for encrypting/signing session cookies */
		SESSION_SECRET: string;
	}
}


