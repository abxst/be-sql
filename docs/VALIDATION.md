# Validation Documentation

## Tổng quan

Dự án sử dụng hệ thống validation toàn diện để đảm bảo tất cả input từ user đều hợp lệ và an toàn trước khi xử lý.

## Validation Functions

### 1. `validateUsername(username)`

Validate username với các quy tắc:

```typescript
{
  valid: boolean,
  errors: string[]
}
```

**Quy tắc:**
- ✅ Phải là string
- ✅ Độ dài: 3-50 ký tự
- ✅ Chỉ chứa: chữ cái (a-z, A-Z), số (0-9), underscore (_), dash (-)
- ✅ Phải bắt đầu bằng chữ cái

**Ví dụ:**

```typescript
// ✅ Valid usernames
validateUsername('admin')        // { valid: true, errors: [] }
validateUsername('user_123')     // { valid: true, errors: [] }
validateUsername('john-doe')     // { valid: true, errors: [] }

// ❌ Invalid usernames
validateUsername('ab')           // Too short
validateUsername('123user')      // Starts with number
validateUsername('user@email')   // Invalid character
validateUsername('a'.repeat(51)) // Too long
```

### 2. `validatePassword(password)`

Validate password với các quy tắc bảo mật:

```typescript
{
  valid: boolean,
  errors: string[]
}
```

**Quy tắc:**
- ✅ Phải là string
- ✅ Độ dài: 6-128 ký tự
- ✅ Phải chứa ít nhất 1 chữ cái
- ✅ Phải chứa ít nhất 1 số
- ✅ Không được là password phổ biến

**Ví dụ:**

```typescript
// ✅ Valid passwords
validatePassword('abc123')       // { valid: true, errors: [] }
validatePassword('MyP@ss123')    // { valid: true, errors: [] }
validatePassword('s3cur3P4ss')   // { valid: true, errors: [] }

// ❌ Invalid passwords
validatePassword('12345')        // Too short
validatePassword('abcdef')       // No number
validatePassword('123456')       // Too weak (common password)
validatePassword('password')     // Too weak (common password)
```

### 3. `validatePrefix(prefix)`

Validate prefix cho user:

```typescript
{
  valid: boolean,
  errors: string[]
}
```

**Quy tắc:**
- ✅ Phải là string
- ✅ Độ dài: 2-20 ký tự
- ✅ Chỉ chứa: chữ cái, số, underscore

**Ví dụ:**

```typescript
// ✅ Valid prefixes
validatePrefix('ABC')            // { valid: true, errors: [] }
validatePrefix('user_001')       // { valid: true, errors: [] }
validatePrefix('PREFIX123')      // { valid: true, errors: [] }

// ❌ Invalid prefixes
validatePrefix('a')              // Too short
validatePrefix('pre-fix')        // Contains dash
validatePrefix('a'.repeat(21))   // Too long
```

### 4. `containsSqlInjection(input)`

Kiểm tra input có chứa SQL injection patterns không:

```typescript
boolean
```

**Patterns được phát hiện:**
- `OR/AND` với equals: `' OR 1=1--`
- `UNION SELECT`: `UNION SELECT * FROM users`
- `INSERT INTO`: `INSERT INTO users...`
- `DELETE FROM`: `DELETE FROM users`
- `DROP TABLE/DATABASE`: `DROP TABLE users`
- `UPDATE SET`: `UPDATE users SET...`
- `EXEC/EXECUTE`: `EXEC sp_executesql`
- Script tags: `<script>`
- SQL comments: `--`, `/* */`
- Dangerous semicolons: `; DROP TABLE`

**Ví dụ:**

```typescript
// ❌ SQL Injection detected
containsSqlInjection("' OR 1=1--")           // true
containsSqlInjection("admin' UNION SELECT")  // true
containsSqlInjection("'; DROP TABLE users")  // true

// ✅ Safe input
containsSqlInjection("admin")                // false
containsSqlInjection("user123")              // false
```

### 5. `sanitizeInput(input)`

Làm sạch input string:

```typescript
string
```

**Xử lý:**
- Trim whitespace
- Remove `<` và `>` characters
- Limit length to 200 characters

**Ví dụ:**

```typescript
sanitizeInput('  admin  ')           // 'admin'
sanitizeInput('<script>alert</>')    // 'scriptalert'
sanitizeInput('a'.repeat(300))       // 'aaa...' (200 chars)
```

## Sử dụng trong Routes

### Register Route

```typescript
export async function handleRegister(request: Request, env: Env): Promise<Response> {
  const { username, password, prefix } = await parseRequestJsonToMap(request);
  
  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return jsonResponse({ 
      status: 'error', 
      error: 'Username validation failed',
      details: usernameValidation.errors 
    }, 400);
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return jsonResponse({ 
      status: 'error', 
      error: 'Password validation failed',
      details: passwordValidation.errors 
    }, 400);
  }
  
  // Check SQL injection
  if (containsSqlInjection(username) || containsSqlInjection(password)) {
    return jsonError('Invalid input detected', 400);
  }
  
  // Proceed with registration...
}
```

### Login Route

```typescript
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const { username, password } = await parseRequestJsonToMap(request);
  
  // Validate username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return jsonResponse({ 
      status: 'error', 
      error: 'Username validation failed',
      details: usernameValidation.errors 
    }, 400);
  }
  
  // Basic password check (not as strict as register)
  if (typeof password !== 'string' || password.length === 0) {
    return jsonError('Password cannot be empty', 400);
  }
  
  // Check SQL injection
  if (containsSqlInjection(username) || containsSqlInjection(password)) {
    return jsonError('Invalid input detected', 400);
  }
  
  // Proceed with login...
}
```

## Response Format

### Success
```json
{
  "status": "ok",
  "data": {...}
}
```

### Validation Error
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

### SQL Injection Detected
```json
{
  "error": "Invalid input detected"
}
```

## Best Practices

### 1. Validate sớm nhất có thể
```typescript
// ✅ GOOD - Validate ngay sau parse
const maps = await parseRequestJsonToMap(request);
const validation = validateUsername(maps.username);
if (!validation.valid) {
  return jsonError(...);
}
```

### 2. Kiểm tra SQL injection cho mọi string input
```typescript
// ✅ GOOD
if (containsSqlInjection(username)) {
  logError(new Error('SQL injection attempt detected'), context);
  return jsonError('Invalid input detected', 400);
}
```

### 3. Return chi tiết lỗi validation
```typescript
// ✅ GOOD - Giúp user biết cần fix gì
return jsonResponse({ 
  status: 'error', 
  error: 'Username validation failed',
  details: usernameValidation.errors 
}, 400);

// ❌ BAD - User không biết lỗi gì
return jsonError('Validation failed', 400);
```

### 4. Log attempts SQL injection
```typescript
if (containsSqlInjection(input)) {
  logError(new Error('SQL injection attempt detected'), { 
    file: 'routes/auth.ts', 
    function: 'handleLogin',
    details: { username } 
  });
  return jsonError('Invalid input detected', 400);
}
```

### 5. Different rules cho register vs login
```typescript
// Register: Strict validation
const passwordValidation = validatePassword(password);

// Login: Basic check only (user đã register với password hợp lệ rồi)
if (typeof password !== 'string' || password.length === 0) {
  return jsonError('Password cannot be empty', 400);
}
```

## Security Considerations

### 1. Defense in Depth
- Validation là layer đầu tiên
- Escape SQL strings là layer thứ hai
- Sử dụng cả hai để đảm bảo an toàn

### 2. Rate Limiting
- Cân nhắc thêm rate limiting cho login endpoint
- Prevent brute force attacks

### 3. Password Hashing
- **Quan trọng**: Hiện tại password đang lưu plain text
- **TODO**: Implement bcrypt/argon2 để hash password

### 4. Error Messages
- Không reveal quá nhiều thông tin trong error messages
- For login: "Invalid credentials" thay vì "Username not found" hay "Wrong password"

## Testing

### Unit Tests
```typescript
describe('validateUsername', () => {
  test('should accept valid username', () => {
    expect(validateUsername('admin').valid).toBe(true);
  });
  
  test('should reject short username', () => {
    const result = validateUsername('ab');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Username must be at least 3 characters');
  });
  
  test('should reject username starting with number', () => {
    const result = validateUsername('123user');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Username must start with a letter');
  });
});
```

### Integration Tests
```bash
# Valid registration
curl -X POST http://localhost:8787/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123","prefix":"TEST"}'

# Invalid username (too short)
curl -X POST http://localhost:8787/register \
  -H "Content-Type: application/json" \
  -d '{"username":"ab","password":"test123","prefix":"TEST"}'

# SQL injection attempt
curl -X POST http://localhost:8787/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin' OR 1=1--\",\"password\":\"test\"}"
```

## Future Improvements

1. **Password Hashing**: Implement bcrypt hoặc argon2
2. **Email Validation**: Thêm email field với validation
3. **2FA**: Two-factor authentication
4. **Rate Limiting**: Implement rate limiting middleware
5. **CAPTCHA**: Thêm CAPTCHA cho login/register
6. **Password Strength Meter**: Real-time feedback cho user
7. **Blacklist**: Maintain blacklist của usernames không cho phép

