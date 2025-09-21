/**
 * Centralized application configuration for Cloudflare Workers.
 * Build a per-request config from the Worker `env` binding.
 *
 * After adding bindings or vars in `wrangler.jsonc`, run:
 *   npm run cf-typegen
 * to regenerate the `Env` type in `worker-configuration.d.ts`.
 */

/**
 * Application-level configuration constructed from the Worker environment.
 * Extend this with derived values (e.g., parsed URLs) as your app grows.
 */
export interface AppConfig {
	readonly env: Env;
	readonly sqlApiUrl: URL;
}

/**
 * Create and freeze the configuration for the current request.
 * Call this at the start of your `fetch` handler and pass it down.
 */
export function createConfig(env: Env): AppConfig {
	const urlString = requireStringVar(env, 'URL_API_SQL');
	let sqlApiUrl: URL;
	try {
		sqlApiUrl = new URL(urlString);
	} catch {
		throw new Error('Invalid URL_API_SQL. Expected a valid absolute URL.');
	}

	return Object.freeze({
		env,
		sqlApiUrl,
	});
}

type StringKeys<T> = { [K in keyof T]-?: T[K] extends string ? K : never }[keyof T];

/**
 * Read a required string variable from `env`. Throws if missing or empty.
 */
export function requireStringVar<K extends StringKeys<Env>>(env: Env, key: K): string {
	const value = env[key] as unknown as string | undefined;
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`Missing required environment variable: ${String(key)}`);
	}
	return value;
}

/**
 * Read an optional string variable from `env`. Returns undefined if absent/blank.
 */
export function optionalStringVar<K extends StringKeys<Env>>(env: Env, key: K): string | undefined {
	const value = env[key] as unknown as string | undefined;
	return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}


