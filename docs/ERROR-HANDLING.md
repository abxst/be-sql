# Error Handling Documentation

## Tổng quan

Dự án sử dụng hệ thống xử lý lỗi tập trung (centralized error handling) với logging chi tiết để dễ dàng debug và theo dõi lỗi trong production.

## Cấu trúc Error Handler

### File: `src/error-handler.ts`

Cung cấp 3 utilities chính:

1. **`logError(error, context)`** - Log lỗi ra console với format chuẩn
2. **`createErrorResponse(error, context, statusCode)`** - Tạo Response lỗi trả về client
3. **`catchErrors(handler, context)`** - Wrapper function để bắt lỗi tự động

## Cách sử dụng

### 1. Trong Route Handler

```typescript
import { logError, createErrorResponse } from '../error-handler';

export async function handleLogin(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/auth.ts', function: 'handleLogin' };
	
	try {
		// Business logic
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			logError(new Error('Unauthorized access attempt'), context);
			return jsonError('Unauthorized', 401);
		}
		
		// Success case
		return jsonResponse({ status: 'ok' });
		
	} catch (error) {
		// Bắt lỗi với context đầy đủ
		return createErrorResponse(error, { 
			...context, 
			details: { username: 'example' } 
		}, 500);
	}
}
```

### 2. Error Context Structure

```typescript
interface ErrorContext {
	file: string;           // Tên file xảy ra lỗi
	function: string;       // Tên function xảy ra lỗi  
	details?: Record<string, any>;  // Thông tin bổ sung (optional)
}
```

### 3. Console Log Output

Khi có lỗi, console sẽ hiển thị:

```json
[ERROR] {
  "timestamp": "2025-10-06T12:34:56.789Z",
  "file": "routes/auth.ts",
  "function": "handleLogin",
  "error": {
    "message": "Invalid credentials",
    "name": "Error",
    "stack": "Error: Invalid credentials\n    at handleLogin..."
  },
  "details": {
    "username": "test_user"
  }
}
```

### 4. Client Response Format

Client nhận được response:

```json
{
  "status": "error",
  "error": "Invalid credentials",
  "context": {
    "file": "routes/auth.ts",
    "function": "handleLogin",
    "timestamp": "2025-10-06T12:34:56.789Z"
  },
  "details": {
    "username": "test_user"
  }
}
```

## Best Practices

### ✅ DO

1. **Luôn cung cấp context đầy đủ**
   ```typescript
   const context = { file: 'routes/auth.ts', function: 'handleLogin' };
   ```

2. **Thêm details khi cần thiết**
   ```typescript
   return createErrorResponse(error, { 
     ...context, 
     details: { userId, action: 'delete' } 
   }, 500);
   ```

3. **Log lỗi validation riêng**
   ```typescript
   if (!username) {
     logError(new Error('Missing username'), { ...context, details: { fields: ['username'] } });
     return jsonError('Username is required', 400);
   }
   ```

4. **Nested try-catch cho SQL operations**
   ```typescript
   try {
     // Parse request
     const data = await parseJson(request);
     
     try {
       // SQL operation
       await executeSqlQuery(config, query);
     } catch (error) {
       return createErrorResponse(error, { ...context, details: { query } }, 502);
     }
   } catch (error) {
     return createErrorResponse(error, context, 400);
   }
   ```

### ❌ DON'T

1. **Không throw lỗi ra ngoài handler**
   ```typescript
   // BAD
   throw new Error('Something wrong');
   
   // GOOD
   return createErrorResponse(new Error('Something wrong'), context, 500);
   ```

2. **Không bỏ qua context**
   ```typescript
   // BAD
   catch (error) {
     return new Response('Error', { status: 500 });
   }
   
   // GOOD
   catch (error) {
     return createErrorResponse(error, context, 500);
   }
   ```

3. **Không log thông tin nhạy cảm (passwords, tokens)**
   ```typescript
   // BAD
   logError(error, { ...context, details: { password } });
   
   // GOOD
   logError(error, { ...context, details: { username } });
   ```

## Error Types và Status Codes

| Status | Type | Khi nào dùng |
|--------|------|--------------|
| 400 | Bad Request | Dữ liệu đầu vào không hợp lệ |
| 401 | Unauthorized | Không có quyền truy cập |
| 404 | Not Found | Không tìm thấy resource |
| 500 | Internal Server Error | Lỗi server không xác định |
| 502 | Bad Gateway | Lỗi kết nối database/external API |

## Monitoring & Debugging

### CloudFlare Dashboard
- Tất cả logs được ghi vào CloudFlare Workers Logs
- Truy cập: Dashboard > Workers > be-sql > Logs

### Local Development
- Logs hiển thị trong terminal khi chạy `npm run dev`
- Format JSON để dễ parse và filter

### Production
- Sử dụng CloudFlare Analytics để theo dõi error rates
- Set up alerts cho critical errors (5xx codes)

## Examples

Xem các file trong `src/routes/` để xem ví dụ thực tế về cách implement error handling trong từng route handler.

