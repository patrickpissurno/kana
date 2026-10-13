SET TIME ZONE 'America/Sao_Paulo';

CREATE SCHEMA db_migrations;

CREATE TABLE db_migrations.history (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    hash TEXT NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);
