# SQLite Database Schema

## Overview

Dự án sử dụng SQLite database thông qua SQL API. Tất cả queries đã được convert sang SQLite syntax.

## Tables

### 1. `users` Table

Quản lý user accounts.

```sql
CREATE TABLE "users" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "last_login" TEXT,
  "created_at" TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE UNIQUE INDEX "idx_users_username" ON "users"("username");
CREATE INDEX "idx_users_prefix" ON "users"("prefix");
```

**Columns:**
- `id`: Primary key, auto-increment
- `username`: Unique username (3-50 chars, validated)
- `password`: Password (6-128 chars, validated - **TODO: hash passwords!**)
- `prefix`: User prefix (2-20 chars, validated)
- `last_login`: Last login timestamp (SQLite TEXT format)
- `created_at`: Account creation timestamp

### 2. `ukeys` Table

Quản lý license keys cho users.

```sql
CREATE TABLE "ukeys" (
  "id_key" INTEGER PRIMARY KEY AUTOINCREMENT,
  "key" TEXT NOT NULL UNIQUE,
  "length" INTEGER NOT NULL,
  "prefix" TEXT NOT NULL,
  "time_start" TEXT,
  "time_end" TEXT,
  "id_device" TEXT,
  "created_at" TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE UNIQUE INDEX "idx_ukeys_key" ON "ukeys"("key");
CREATE INDEX "idx_ukeys_prefix" ON "ukeys"("prefix");
CREATE INDEX "idx_ukeys_device" ON "ukeys"("id_device");
```

**Columns:**
- `id_key`: Primary key, auto-increment
- `key`: Unique license key (format: `{prefix}_{length}_{random}`)
- `length`: License duration in days
- `prefix`: User prefix (foreign key to users.prefix)
- `time_start`: First activation timestamp
- `time_end`: Expiration timestamp (calculated as time_start + length days)
- `id_device`: Device ID that activated the key
- `created_at`: Key creation timestamp

### 3. `demo` Table (for testing)

Demo table cho `/check-db` endpoint.

```sql
CREATE TABLE "demo" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "author" TEXT,
  "content" TEXT
);

-- Sample data
INSERT INTO "demo" ("author", "content") VALUES 
  ('Kristian', 'Congrats!'),
  ('Serena', 'Great job!'),
  ('Max', 'Keep up the good work!');
```

## SQLite vs MySQL Differences

### 1. Identifiers
```sql
-- MySQL: Backticks
SELECT `id`, `username` FROM `users`;

-- SQLite: Double quotes (or no quotes for simple names)
SELECT "id", "username" FROM "users";
```

### 2. Datetime Functions
```sql
-- MySQL
UPDATE users SET last_login = CURRENT_TIMESTAMP;
UPDATE ukeys SET time_end = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY);

-- SQLite
UPDATE "users" SET "last_login" = datetime('now');
UPDATE "ukeys" SET "time_end" = datetime('now', '+30 days');
```

### 3. Auto Increment
```sql
-- MySQL
id INT AUTO_INCREMENT PRIMARY KEY

-- SQLite
"id" INTEGER PRIMARY KEY AUTOINCREMENT
```

### 4. Data Types
SQLite có dynamic typing, nhưng recommended types:
- `INTEGER` - for numbers
- `TEXT` - for strings
- `REAL` - for floats
- `BLOB` - for binary data

## Common Queries

### User Operations

**Register:**
```sql
INSERT INTO "users"("username", "password", "prefix") 
VALUES ('admin', 'admin123', 'ADM');
```

**Login:**
```sql
SELECT * FROM "users" 
WHERE "username"='admin' AND "password"='admin123' 
LIMIT 1;

UPDATE "users" 
SET "last_login" = datetime('now') 
WHERE "username" = 'admin';
```

**Get user info:**
```sql
SELECT "id", "username", "prefix", "last_login" 
FROM "users" 
WHERE "prefix" = 'ADM';
```

### Key Operations

**Get keys (paginated):**
```sql
SELECT * FROM "ukeys" 
WHERE "prefix"='ADM' 
ORDER BY "id_key" ASC 
LIMIT 50 OFFSET 0;
```

**Add keys:**
```sql
INSERT INTO "ukeys"("key", "length", "prefix") VALUES 
  ('ADM_30_abc123xyz456', 30, 'ADM'),
  ('ADM_30_def789uvw012', 30, 'ADM');
```

**Delete key:**
```sql
DELETE FROM "ukeys" 
WHERE "key" = 'ADM_30_abc123xyz456' AND "prefix" = 'ADM';
```

**Reset key (remove device binding):**
```sql
UPDATE "ukeys" 
SET "id_device" = NULL 
WHERE "key" = 'ADM_30_abc123xyz456' AND "prefix" = 'ADM';
```

### Client Login Operations

**First login (activate key):**
```sql
-- Check key status
SELECT "time_start", "time_end", "length", "id_device" 
FROM "ukeys" 
WHERE "key" = 'ADM_30_abc123xyz456' 
LIMIT 1;

-- Activate (set time_start, time_end, device)
UPDATE "ukeys" 
SET "time_start" = datetime('now'), 
    "time_end" = datetime('now', '+30 days'), 
    "id_device" = 'device123' 
WHERE "key" = 'ADM_30_abc123xyz456';
```

**Reset device:**
```sql
UPDATE "ukeys" 
SET "id_device" = 'new_device456' 
WHERE "key" = 'ADM_30_abc123xyz456';
```

## DateTime Format

SQLite stores datetime as TEXT in ISO 8601 format:
```
YYYY-MM-DD HH:MM:SS
2025-10-06 12:34:56
```

**Common datetime functions:**
```sql
-- Current time
datetime('now')              -- 2025-10-06 12:34:56
date('now')                  -- 2025-10-06
time('now')                  -- 12:34:56

-- Add/subtract time
datetime('now', '+30 days')  -- Add 30 days
datetime('now', '-1 hour')   -- Subtract 1 hour
datetime('now', '+1 month')  -- Add 1 month

-- Format
strftime('%Y-%m-%d', 'now')  -- Custom format
```

## Indexes

Recommended indexes for performance:

```sql
-- Users table
CREATE UNIQUE INDEX "idx_users_username" ON "users"("username");
CREATE INDEX "idx_users_prefix" ON "users"("prefix");

-- Keys table
CREATE UNIQUE INDEX "idx_ukeys_key" ON "ukeys"("key");
CREATE INDEX "idx_ukeys_prefix" ON "ukeys"("prefix");
CREATE INDEX "idx_ukeys_device" ON "ukeys"("id_device");
CREATE INDEX "idx_ukeys_time_end" ON "ukeys"("time_end");
```

## Migration from MySQL

Nếu bạn đang migrate từ MySQL sang SQLite:

1. **Chạy conversion script trên data:**
   ```bash
   # Export từ MySQL
   mysqldump -u user -p database > mysql_dump.sql
   
   # Convert sang SQLite (replace backticks, functions, etc.)
   sed 's/`/"/g' mysql_dump.sql > sqlite_dump.sql
   
   # Import vào SQLite
   sqlite3 database.db < sqlite_dump.sql
   ```

2. **Update datetime columns:**
   ```sql
   -- Convert MySQL datetime to SQLite format
   UPDATE "users" 
   SET "last_login" = datetime("last_login");
   ```

3. **Test thoroughly** - Đảm bảo tất cả queries hoạt động đúng

## Security Notes

⚠️ **IMPORTANT:**

1. **Password Hashing**: Hiện tại passwords đang lưu plain text. **PHẢI implement hashing** (bcrypt/argon2) trước production!

2. **SQL Injection Protection**: 
   - Đã có `escapeSqlString()` function
   - Đã có validation và SQL injection detection
   - Consider dùng prepared statements nếu SQL API support

3. **Indexes**: Tạo indexes cho performance, đặc biệt với tables lớn

## Future Improvements

- [ ] Password hashing với bcrypt/argon2
- [ ] Prepared statements support
- [ ] Database migrations system
- [ ] Soft delete cho users/keys
- [ ] Audit log table
- [ ] Foreign key constraints (SQLite hỗ trợ nhưng cần enable)

