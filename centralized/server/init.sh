source ./.env
psql $DATABASE_URL -f init.sql
