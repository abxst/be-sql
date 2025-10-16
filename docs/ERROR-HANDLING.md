# Error Handling Documentation

## Tổng quan

Dự án sử dụng hệ thống xử lý lỗi tập trung (centralized error handling) với logging chi tiết và **hệ thống mã lỗi (error codes)** để dễ dàng debug và theo dõi lỗi trong production.

## Hệ thống mã lỗi (Error Codes)

Mỗi lỗi được gán một mã lỗi duy nhất theo format `0xXYZ`:
- **X** = Category (loại lỗi)
- **YZ** = Specific error (lỗi cụ thể)

### Các loại mã lỗi

| Category | Range | Mô tả |
|----------|-------|-------|
| Authentication | `0x001` - `0x0FF` | Lỗi xác thực và phiên làm việc |
| Validation | `0x100` - `0x1FF` | Lỗi validation dữ liệu đầu vào |
| Database | `0x200` - `0x2FF` | Lỗi database và SQL |
| Request Parsing | `0x300` - `0x3FF` | Lỗi parse request |
| Internal | `0x400` - `0x4FF` | Lỗi nội bộ server |
| Resource | `0x500` - `0x5FF` | Lỗi không tìm thấy resource |
| Rate Limiting | `0x600` - `0x6FF` | Lỗi giới hạn tốc độ/quota |

### Danh sách mã lỗi chi tiết

#### Authentication (`0x001` - `0x0FF`)
- `0x001` - Unauthorized access
- `0x002` - Invalid credentials
- `0x003` - Session expired
- `0x004` - Invalid session token

#### Validation (`0x100` - `0x1FF`)
- `0x100` - Missing required fields
- `0x101` - Invalid username format
- `0x102` - Invalid password format
- `0x103` - Invalid prefix format
- `0x104` - SQL injection detected
- `0x105` - Invalid field type
- `0x106` - Invalid amount value
- `0x107` - Invalid length value
- `0x108` - Username validation failed
- `0x109` - Password validation failed
- `0x10A` - Prefix validation failed
- `0x10B` - Invalid email format
- `0x10C` - Password too long
- `0x10D` - Invalid key type

#### Database (`0x200` - `0x2FF`)
- `0x200` - SQL query failed
- `0x201` - Database connection failed
- `0x202` - Insert failed
- `0x203` - Update failed
- `0x204` - Delete failed
- `0x205` - Query timeout

#### Request Parsing (`0x300` - `0x3FF`)
- `0x300` - JSON parse error
- `0x301` - Invalid content type
- `0x302` - Invalid request format
- `0x303` - Request body too large

#### Internal (`0x400` - `0x4FF`)
- `0x400` - Unknown error
- `0x401` - Configuration error
- `0x402` - Encryption error
- `0x403` - Decryption error

## Cấu trúc Error Handler

### File: `src/error-handler.ts`

Cung cấp 3 utilities chính:

1. **`logError(error, context)`** - Log lỗi ra console với format chuẩn
2. **`createErrorResponse(error, context, statusCode)`** - Tạo Response lỗi trả về client
3. **`catchErrors(handler, context)`** - Wrapper function để bắt lỗi tự động

## Cách sử dụng

### 1. Trong Route Handler (với Error Codes)

```typescript
import { logError, createErrorResponse } from '../error-handler';
import { ErrorCodes } from '../error-codes';
import { jsonErrorWithCode } from './utils';

export async function handleLogin(request: Request, env: Env): Promise<Response> {
	const context = { file: 'routes/auth.ts', function: 'handleLogin' };
	
	try {
		// Business logic
		const session = await readSessionFromRequest(env, request);
		if (!session) {
			logError(new Error('Unauthorized access attempt'), { 
				...context,
				errorCode: ErrorCodes.UNAUTHORIZED,
				env
			});
			return jsonErrorWithCode(ErrorCodes.UNAUTHORIZED, context, env);
		}
		
		// Success case
		return jsonResponse({ status: 'ok' });
		
	} catch (error) {
		// Bắt lỗi với context đầy đủ và error code
		return createErrorResponse(error, { 
			...context, 
			details: { username: 'example' },
			errorCode: ErrorCodes.SQL_QUERY_FAILED,
			env
		});
	}
}
```

### 2. Error Context Structure

```typescript
interface ErrorContext {
	file: string;           // Tên file xảy ra lỗi
	function: string;       // Tên function xảy ra lỗi  
	details?: Record<string, any>;  // Thông tin bổ sung (optional)
	errorCode?: ErrorCode;  // Mã lỗi (optional, nhưng nên dùng)
	env?: Env;             // Environment variables (optional)
}
```

### 3. Console Log Output

Khi có lỗi, console sẽ hiển thị (bao gồm errorCode):

```json
[ERROR] {
  "timestamp": "2025-10-16T12:34:56.789Z",
  "errorCode": "0x002",
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

#### Development Mode (IS_DEBUG=true)
Client nhận được response đầy đủ:

```json
{
  "status": "error",
  "errorCode": "0x002",
  "errorDescription": "Invalid credentials provided",
  "error": "Invalid credentials",
  "context": {
    "file": "routes/auth.ts",
    "function": "handleLogin",
    "timestamp": "2025-10-16T12:34:56.789Z"
  },
  "details": {
    "username": "test_user"
  }
}
```

#### Production Mode (IS_DEBUG=false)
Client nhận được response rút gọn (chỉ có errorCode và error message):

```json
{
  "status": "error",
  "errorCode": "0x002",
  "error": "Invalid credentials provided"
}
```

## Best Practices

### ✅ DO

1. **Luôn cung cấp context đầy đủ với errorCode**
   ```typescript
   const context = { 
     file: 'routes/auth.ts', 
     function: 'handleLogin',
     errorCode: ErrorCodes.UNAUTHORIZED,
     env
   };
   ```

2. **Sử dụng jsonErrorWithCode cho error responses đơn giản**
   ```typescript
   if (!session) {
     return jsonErrorWithCode(ErrorCodes.UNAUTHORIZED, context, env);
   }
   ```

3. **Sử dụng createErrorResponse với errorCode cho error phức tạp**
   ```typescript
   return createErrorResponse(error, { 
     ...context, 
     details: { userId, action: 'delete' },
     errorCode: ErrorCodes.DELETE_FAILED,
     env
   });
   ```

4. **Log lỗi validation với errorCode**
   ```typescript
   if (!username) {
     logError(new Error('Missing username'), { 
       ...context, 
       details: { fields: ['username'] },
       errorCode: ErrorCodes.MISSING_FIELDS,
       env
     });
     return jsonErrorWithCode(ErrorCodes.MISSING_FIELDS, {
       ...context,
       details: { fields: ['username'] }
     }, env);
   }
   ```

5. **Nested try-catch cho SQL operations với errorCode**
   ```typescript
   try {
     // Parse request
     const data = await parseJson(request);
     
     try {
       // SQL operation
       await executeSqlQuery(config, query);
     } catch (error) {
       return createErrorResponse(error, { 
         ...context, 
         details: { query },
         errorCode: ErrorCodes.SQL_QUERY_FAILED,
         env
       });
     }
   } catch (error) {
     return createErrorResponse(error, { 
       ...context,
       errorCode: ErrorCodes.JSON_PARSE_ERROR,
       env
     });
   }
   ```

### ❌ DON'T

1. **Không throw lỗi ra ngoài handler**
   ```typescript
   // BAD
   throw new Error('Something wrong');
   
   // GOOD
   return createErrorResponse(new Error('Something wrong'), {
     ...context,
     errorCode: ErrorCodes.UNKNOWN_ERROR,
     env
   });
   ```

2. **Không bỏ qua context và errorCode**
   ```typescript
   // BAD
   catch (error) {
     return new Response('Error', { status: 500 });
   }
   
   // GOOD
   catch (error) {
     return createErrorResponse(error, {
       ...context,
       errorCode: ErrorCodes.UNKNOWN_ERROR,
       env
     });
   }
   ```

3. **Không quên thêm errorCode khi log lỗi**
   ```typescript
   // BAD
   logError(error, { ...context, details: { userId } });
   
   // GOOD
   logError(error, { 
     ...context, 
     details: { userId },
     errorCode: ErrorCodes.USER_NOT_FOUND,
     env
   });
   ```

4. **Không log thông tin nhạy cảm (passwords, tokens)**
   ```typescript
   // BAD
   logError(error, { ...context, details: { password } });
   
   // GOOD
   logError(error, { ...context, details: { username } });
   ```

## Error Types và Status Codes

| Status | Type | Khi nào dùng | Error Code Range |
|--------|------|--------------|------------------|
| 400 | Bad Request | Dữ liệu đầu vào không hợp lệ | `0x100-0x1FF`, `0x300-0x3FF` |
| 401 | Unauthorized | Không có quyền truy cập | `0x001-0x0FF` |
| 404 | Not Found | Không tìm thấy resource | `0x500-0x5FF` |
| 429 | Too Many Requests | Rate limit exceeded | `0x600-0x6FF` |
| 500 | Internal Server Error | Lỗi server không xác định | `0x400-0x4FF` |
| 502 | Bad Gateway | Lỗi kết nối database/external API | `0x200-0x2FF` |

### Mapping Error Code → HTTP Status

Hệ thống tự động map error code thành HTTP status code phù hợp:

```typescript
// Ví dụ:
ErrorCodes.UNAUTHORIZED        → 401
ErrorCodes.MISSING_FIELDS      → 400
ErrorCodes.SQL_QUERY_FAILED    → 502
ErrorCodes.NOT_FOUND           → 404
ErrorCodes.RATE_LIMIT_EXCEEDED → 429
ErrorCodes.UNKNOWN_ERROR       → 500
```

Khi sử dụng `createErrorResponse` với `errorCode`, bạn không cần chỉ định `statusCode` parameter - nó sẽ tự động được xác định dựa trên error code.

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

