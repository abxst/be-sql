import { handleClientLogin } from './client-login';
import { handleRegister, handleLogin, handleLogout } from './routes/auth';
import { handleGetKey, handleAddKey, handleDeleteKey, handleResetKey } from './routes/keys';
import { handleGetInfo } from './routes/user';
import { handleCheckEnv, handleCheckDb, handleParseJson } from './routes/debug';

export async function routeRequest(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);

	switch (url.pathname) {
		case '/check-env':
			return handleCheckEnv(request, env);

		case '/check-db':
			return handleCheckDb(request, env);

		case '/register':
			return handleRegister(request, env);

		case '/login':
			return handleLogin(request, env);

		case '/parse-json':
			return handleParseJson(request, env);

		case '/get-key':
			return handleGetKey(request, env);

		case '/add-key':
			return handleAddKey(request, env);

		case '/logout':
			return handleLogout(request, env);

		case '/delete-key':
			return handleDeleteKey(request, env);

		case '/reset-key':
			return handleResetKey(request, env);

		case '/login-client':
			return handleClientLogin(request, env);

		case '/get-info':
			return handleGetInfo(request, env);

		default:
			return new Response('Hello World!');
	}
}


