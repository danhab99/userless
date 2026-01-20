# Database Configuration

The server supports both SQLite and PostgreSQL databases using Go's standard library `database/sql`.

## Configuration

Database settings are configured in the TOML configuration file under the `[database]` section:

```toml
[database]
driver = "sqlite3"  # or "postgres"
dsn = "./userless.db"  # Data Source Name
```

## SQLite

SQLite is the default and easiest option for development and small deployments.

### Configuration Example

```toml
[database]
driver = "sqlite3"
dsn = "./userless.db"
```

The DSN is simply the path to the database file. The file will be created automatically if it doesn't exist.

### Benefits
- No separate database server required
- Single file storage
- Perfect for development and testing
- Easy backups (just copy the .db file)

## PostgreSQL

PostgreSQL is recommended for production deployments with higher load.

### Configuration Example

```toml
[database]
driver = "postgres"
dsn = "host=localhost port=5432 user=userless password=userless dbname=userless sslmode=disable"
```

### DSN Format

The PostgreSQL DSN (Data Source Name) follows this format:
```
host=<hostname> port=<port> user=<username> password=<password> dbname=<database> sslmode=<mode>
```

Parameters:
- `host`: Database server hostname (e.g., "localhost", "db.example.com")
- `port`: Database server port (default: 5432)
- `user`: Database username
- `password`: Database password
- `dbname`: Database name
- `sslmode`: SSL mode ("disable", "require", "verify-ca", "verify-full")

### Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE userless;
CREATE USER userless WITH PASSWORD 'userless';
GRANT ALL PRIVILEGES ON DATABASE userless TO userless;
```

2. Update your config file with the connection details

3. Start the server - tables will be created automatically

### Benefits
- Better performance under load
- Advanced querying capabilities
- Better concurrency support
- Industry standard for production deployments

## Schema Management

The database schema is automatically initialized when the server starts. Tables and indexes are created if they don't exist.

### Tables Created

- `public_keys`: PGP public keys
- `public_key_policies`: Access policies for public keys  
- `threads`: Discussion threads/posts
- `thread_refs`: Named references to threads
- `thread_policies`: Visibility and reply policies for threads
- `files`: Uploaded file metadata

## Migration from Prisma

If you're migrating from the previous Prisma-based version:

1. Export your existing data from Prisma
2. Update your config with the new `[database]` section
3. Remove the old `DATABASE_URL` environment variable
4. Start the server to create the new schema
5. Import your data into the new database

Note: The Prisma client and schema files have been completely removed in favor of standard library SQL.
