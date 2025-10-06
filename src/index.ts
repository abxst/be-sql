/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { createErrorResponse } from './error-handler';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const context = { file: 'index.ts', function: 'fetch' };
		
		try {
			const { routeRequest } = await import('./router');
			const { withCors, preflightCors } = await import('./cors');
			
			if (request.method === 'OPTIONS') {
				return preflightCors(request, env);
			}
			
			const resp = await routeRequest(request, env);
			return withCors(resp, request, env);
		} catch (error) {
			return createErrorResponse(error, { ...context, details: { 
				url: request.url, 
				method: request.method 
			}}, 500);
		}
	},
} satisfies ExportedHandler<Env>;
