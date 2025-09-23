import { decryptJson, encryptJson } from './auth';

export async function handleClientLogin(request: Request, env: Env): Promise<Response> {
	try {
		const body = await request.text();
		const maps = await decryptJson(env, body);
		if (!maps) {
			return new Response(JSON.stringify({ error: 'Invalid encrypted JSON' }, null, 2), {
				status: 400,
				headers: { 'content-type': 'application/json; charset=utf-8' },
			});
		}
		const missing: string[] = [];
		for (const key of ['key', 'id_device']) {
			if (!(key in maps)) missing.push(key);
		}
		if (missing.length > 0) {
			return new Response(JSON.stringify({ error: 'Missing required fields', fields: missing }, null, 2), {
				status: 400,
				headers: { 'content-type': 'application/json; charset=utf-8' },
			});
		}
		const key = maps['key'];
		const idDevice = maps['id_device'];
		if (typeof key !== 'string' || typeof idDevice !== 'string') {
			return new Response(JSON.stringify({ error: 'key and id_device must be strings' }, null, 2), {
				status: 400,
				headers: { 'content-type': 'application/json; charset=utf-8' },
			});
		}

				const { executeSqlQuery } = await import('./sql');
				const config = await import('./config').then(m => m.createConfig(env));

				// First, check if time_start is NULL
				const checkQuery = `SELECT \`time_start\`, \`time_end\`, \`length\` FROM \`ukeys\` WHERE \`key\` = '${escapeSqlString(key)}' LIMIT 1`;
				const rows = await executeSqlQuery(config, checkQuery);
				let statusMessage = 'ok';
				let result;
				if (Array.isArray(rows) && rows.length > 0) {
					const row = rows[0] as any;
					switch (true) {
						case row.id_device && row.id_device !== idDevice:
							// Wrong device ID
							const responseDataError = { status: 'error', message: 'Wrong device ID', current_device: row.id_device };
							const encryptedResponseError = await encryptJson(env, responseDataError);
							return new Response(encryptedResponseError, {
								headers: { 'content-type': 'text/plain; charset=utf-8' },
							});
						case row.time_end && new Date(row.time_end + 'Z') < new Date():
							// Expired usage
							const responseDataExpired = { status: 'error', message: 'License expired', expired_at: row.time_end };
							const encryptedResponseExpired = await encryptJson(env, responseDataExpired);
							return new Response(encryptedResponseExpired, {
								headers: { 'content-type': 'text/plain; charset=utf-8' },
							});
						case !row.time_start || row.time_start === null:
							// First login: set time_start and time_end, then update id_device
							const setTimeQuery = `UPDATE \`ukeys\` SET \`time_start\` = CURRENT_TIMESTAMP, \`time_end\` = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ${row.length} DAY), \`id_device\` = '${escapeSqlString(idDevice)}' WHERE \`key\` = '${escapeSqlString(key)}'`;
							result = await executeSqlQuery(config, setTimeQuery);
							statusMessage = 'first_login';
							break;
						case !row.id_device || row.id_device === null:
							// Reset device: just update id_device
							const updateQuery = `UPDATE \`ukeys\` SET \`id_device\` = '${escapeSqlString(idDevice)}' WHERE \`key\` = '${escapeSqlString(key)}'`;
							result = await executeSqlQuery(config, updateQuery);
							statusMessage = 'reset_device';
							break;
						case row.id_device === idDevice && (!row.time_end || new Date(row.time_end + 'Z') >= new Date()):
							// Correct device ID and still valid - no need to update
							result = null; // No update, affectedRows = 0
							statusMessage = 'welcome_back';
							break;
						default:
							// Unknown error
							const responseDataUnknown = { status: 'error', message: 'Unknown error' };
							const encryptedResponseUnknown = await encryptJson(env, responseDataUnknown);
							return new Response(encryptedResponseUnknown, {
								headers: { 'content-type': 'text/plain; charset=utf-8' },
							});
					}
				}

				const responseData = { status: 'ok', message: statusMessage, updated: (result as any).affectedRows || 0 };
		const encryptedResponse = await encryptJson(env, responseData);
		return new Response(encryptedResponse, {
			headers: {
				'content-type': 'text/plain; charset=utf-8',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST',
				'Access-Control-Allow-Headers': '*',
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid request';
		return new Response(JSON.stringify({ error: message }, null, 2), {
			status: 400,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	}
}

function escapeSqlString(value: string): string {
	return value.replace(/'/g, "''");
}
