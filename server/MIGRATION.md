# Migration from Prisma to Standard Library SQL

This document summarizes the changes made to remove Prisma ORM and replace it with Go's standard library `database/sql`.

## Overview

The migration replaces the Prisma ORM with a native Go SQL implementation that supports both SQLite and PostgreSQL databases. This change:
- Removes external code generation dependencies
- Uses Go standard library for better control and performance
- Supports multiple database backends (SQLite for development, PostgreSQL for production)
- Maintains the same data model and functionality

## Files Changed

### New Files
- `server/db.go` - Complete database layer implementation with models and queries
- `server/DATABASE.md` - Database configuration documentation
- `server/example_configs/postgres.toml` - PostgreSQL configuration example

### Modified Files
- `server/config.go` - Added `DatabaseConfig` struct
- `server/context.go` - Updated to use new Database instead of Prisma client
- `server/main.go` - Pass config to context initialization
- `server/thread.go` - Use new database methods instead of Prisma
- `server/key.go` - Use new database methods instead of Prisma
- `server/file.go` - Use new database methods instead of Prisma
- `server/post.go` - Use new database methods instead of Prisma
- `server/register.go` - Use new database methods instead of Prisma
- `server/search.go` - Use new database methods instead of Prisma
- `server/upload.go` - Use new database methods instead of Prisma
- `server/middleware.go` - Use new database methods instead of Prisma
- `server/banner.go` - Removed Prisma dependency
- `server/go.mod` - Removed Prisma, added SQLite and PostgreSQL drivers
- `server/makefile` - Removed Prisma commands
- `server/example_configs/*.toml` - Added database configuration
- `.gitignore` - Added database file patterns

### Removed Files
- `server/prisma/` - Entire Prisma directory including schema and generated code

## Configuration Changes

### Before (Prisma)
Database was configured via environment variable:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/userless?schema=public"
```

### After (Standard SQL)
Database is configured in the TOML config file:

**For SQLite:**
```toml
[database]
driver = "sqlite3"
dsn = "./userless.db"
```

**For PostgreSQL:**
```toml
[database]
driver = "postgres"
dsn = "host=localhost port=5432 user=userless password=userless dbname=userless sslmode=disable"
```

## Data Model

The data model remains the same as the Prisma schema:

### Tables
1. **public_keys** - PGP public keys
   - Primary key: `id` (UUID)
   - Unique keys: `armored_key`, `finger`, `key_id`
   - Foreign key: `policy_id` → `public_key_policies(id)`

2. **public_key_policies** - Access control for keys
   - Primary key: `id` (UUID)
   - Fields: revoked, allowed_to_post, can_start_threads, is_master, allowed_to_upload_files, max_file_size

3. **threads** - Discussion threads/posts
   - Primary key: `id` (UUID)
   - Unique key: `hash`
   - Foreign keys:
     - `reply_to` → `threads(hash)`
     - `signed_by_id` → `public_keys(id)`

4. **thread_refs** - Named references to threads
   - Primary key: `id` (UUID)
   - Unique key: `name`
   - Foreign key: `thread_hash` → `threads(hash)`

5. **thread_policies** - Visibility and reply settings
   - Primary key: `id` (UUID)
   - Unique key: `thread_hash`
   - Foreign key: `thread_hash` → `threads(hash)`

6. **files** - File upload metadata
   - Primary key: `id` (UUID)
   - Unique key: `hash`
   - Foreign key: `signed_by_id` → `public_keys(finger)`

## Schema Initialization

The schema is automatically created when the server starts if tables don't exist. The SQL DDL is different for SQLite and PostgreSQL:

- **SQLite**: Uses `INTEGER` for booleans, `TEXT` for JSON
- **PostgreSQL**: Uses `BOOLEAN` for booleans, `JSONB` for JSON

## Migration Path

If you have existing data in Prisma:

1. Export your Prisma data
2. Update config file with new `[database]` section
3. Remove `DATABASE_URL` environment variable
4. Start the server to create the new schema
5. Import your data into the new database

## Testing

The implementation has been tested with:
- SQLite database initialization
- Server startup and configuration loading
- Schema creation with proper tables and indexes
- Build compilation without errors

## Development Workflow

### Before (Prisma)
```bash
# Generate Prisma client
make generate

# Push schema changes
make db

# Run server
make run
```

### After (Standard SQL)
```bash
# Just run the server (schema auto-created)
make run
```

## Benefits

1. **No Code Generation**: No need to run Prisma generate before building
2. **Standard Library**: Uses well-tested Go standard library
3. **Multi-Database**: Easy to switch between SQLite and PostgreSQL
4. **Better Control**: Direct control over SQL queries
5. **Simpler Build**: No external tools in the build chain
6. **Transparent**: Clear SQL queries visible in code

## Performance Notes

- All queries use prepared statements for security
- Indexes maintained from original Prisma schema
- Connection pooling handled by `database/sql`
- Transactions not yet implemented (can be added as needed)

## Future Enhancements

Potential improvements for the future:
1. Add transaction support for multi-step operations
2. Implement connection pooling configuration
3. Add database migrations system
4. Add query result caching
5. Add batch operations for better performance
