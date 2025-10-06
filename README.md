# BE-SQL

Backend TypeScript trên CloudFlare Workers để kết nối MySQL và phục vụ web panel.

## Mô tả

Dự án backend serverless sử dụng TypeScript, chạy trên CloudFlare Workers. Cung cấp API cho MySQL, xác thực bằng cookie mã hóa, quản lý khóa người dùng.

## Tính năng

- Backend serverless với CloudFlare Workers.
- TypeScript cho an toàn kiểu dữ liệu.
- Kết nối MySQL.
- Xác thực bằng cookie phiên mã hóa AES-GCM.
- Quản lý khóa API.
- Hỗ trợ CORS.
- Cấu trúc code module hóa với routes tách biệt.
- **Xử lý lỗi thống nhất với logging chi tiết** (file, function, timestamp, details).
- **Validation đầy đủ cho input** (username, password, prefix) với SQL injection protection.

## Yêu cầu

- Biến môi trường:
  - `SESSION_SECRET`: Khóa bí mật mạnh (≥32 ký tự).
  - `URL_API_SQL`: URL MySQL API.
  - `ALLOWED_ORIGINS` (tùy chọn): Danh sách origins được phép CORS (cách nhau bởi dấu phẩy).
  - `IS_DEBUG` (tùy chọn): Bật/tắt debug logging (`true`/`false`, mặc định: `true`).

## Cài đặt

1. Clone: `git clone <url> && cd be-sql`
2. Cài đặt: `npm install`
3. Thiết lập `.env` (file đã có sẵn, chỉ cần cập nhật các giá trị):
   ```bash
   URL_API_SQL=https://your-mysql-api-url.com/sql
   SESSION_SECRET=your-strong-secret-key-at-least-32-chars
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8787,https://yourdomain.com
   IS_DEBUG=true  # Set to false in production to disable debug logs
   ```
   
   **Lưu ý**: File `.env` đã có sẵn với giá trị localhost cho development.
4. Chạy: `npm run dev` (local) hoặc `npm run deploy`.

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /check-env | Kiểm tra biến môi trường |
| GET | /check-db | Kiểm tra kết nối DB |
| POST | /register | Đăng ký user |
| POST | /login | Đăng nhập (set cookie) |
| GET | /logout | Đăng xuất (xóa cookie) |
| GET | /get-key | Liệt kê khóa (auth) |
| POST | /add-key | Thêm khóa (auth) |
| POST | /delete-key | Xóa khóa (auth) |
| GET | /get-info | Lấy thông tin user (auth) |
| POST | /reset-key | Reset khóa (auth) |
| POST | /login-client | Login với key và id_device |

## Xác thực

Cookie HttpOnly, Secure, SameSite=None. Mã hóa AES-GCM. Logout xóa cookie.

## Cấu trúc dự án

```
src/
├── routes/          # Route handlers được tách theo chức năng
│   ├── auth.ts      # Authentication routes (/register, /login, /logout)
│   ├── keys.ts      # Key management routes (/get-key, /add-key, /delete-key, /reset-key)
│   ├── user.ts      # User routes (/get-info)
│   ├── debug.ts     # Debug routes (/check-env, /check-db, /parse-json)
│   └── utils.ts     # Shared utilities
├── error-handler.ts # Centralized error handling & logging
├── validation.ts    # Input validation & SQL injection protection
├── router.ts        # Main router (clean & minimal)
├── auth.ts          # Authentication utilities
├── config.ts        # Configuration management
├── sql.ts           # SQL execution
└── index.ts         # Entry point
```

## Xử lý lỗi (Error Handling)

Dự án sử dụng hệ thống xử lý lỗi thống nhất với logging chi tiết:

### Format lỗi JSON Response:
```json
{
  "status": "error",
  "error": "Error message",
  "context": {
    "file": "routes/auth.ts",
    "function": "handleLogin",
    "timestamp": "2025-10-06T12:00:00.000Z"
  },
  "details": {
    "username": "example_user"
  }
}
```

### Console Error Log Format:
```json
{
  "timestamp": "2025-10-06T12:00:00.000Z",
  "file": "routes/auth.ts",
  "function": "handleLogin",
  "error": {
    "message": "Invalid credentials",
    "name": "Error",
    "stack": "..."
  },
  "details": {
    "username": "example_user"
  }
}
```

Mọi lỗi đều được log ra console với đầy đủ thông tin để dễ dàng debug và theo dõi.

### Debug Mode

Control logging và error responses với biến môi trường `IS_DEBUG`:

- **`IS_DEBUG=true`** (default - Development):
  - Bật tất cả console logs (INFO, DEBUG, ERROR)
  - Error responses hiển thị đầy đủ chi tiết (file, function, stack trace, details)
  - Validation errors hiển thị cụ thể lỗi gì

- **`IS_DEBUG=false`** (Production):
  - Chỉ log ERROR vào console (tắt INFO/DEBUG logs)
  - Error responses chỉ hiển thị thông tin cơ bản (không expose kỹ thuật)
  - Validation errors hiển thị message tổng quát

```bash
# Development
IS_DEBUG=true

# Production
IS_DEBUG=false
```

**Ví dụ Error Response:**

**Development (`IS_DEBUG=true`):**
```json
{
  "status": "error",
  "error": "internal error; reference = 3b7l7ug...",
  "context": {
    "file": "routes/auth.ts",
    "function": "handleLogin",
    "timestamp": "2025-10-06T12:00:00.000Z"
  },
  "details": {
    "username": "admin"
  }
}
```

**Production (`IS_DEBUG=false`):**
```json
{
  "status": "error",
  "error": "Internal Server Error"
}
```

**Lưu ý:** ERROR logs luôn được ghi vào console bất kể `IS_DEBUG` là gì để đảm bảo có thể track issues trong production.

## Validation & Bảo mật

Dự án sử dụng hệ thống validation toàn diện cho mọi input:

### Username Validation
- ✅ Độ dài: 3-50 ký tự
- ✅ Ký tự hợp lệ: chữ cái, số, underscore (_), dash (-)
- ✅ Phải bắt đầu bằng chữ cái
- ✅ Không chứa ký tự đặc biệt nguy hiểm

### Password Validation
- ✅ Độ dài: 6-128 ký tự
- ✅ Phải chứa ít nhất 1 chữ cái
- ✅ Phải chứa ít nhất 1 số
- ✅ Không phải là password phổ biến (123456, password, etc.)
- ✅ Kiểm tra SQL injection patterns

### Prefix Validation
- ✅ Độ dài: 2-20 ký tự
- ✅ Ký tự hợp lệ: chữ cái, số, underscore
- ✅ Không chứa ký tự đặc biệt

### SQL Injection Protection
- ✅ Phát hiện patterns nguy hiểm (OR/AND injection, UNION SELECT, DROP TABLE, etc.)
- ✅ Escape single quotes trong SQL queries
- ✅ Validate input format trước khi xử lý

### Error Response Format (Validation)
```json
{
  "status": "error",
  "error": "Username validation failed",
  "details": [
    "Username must be at least 3 characters",
    "Username must start with a letter"
  ]
}
```

## Tác giả

abxST
