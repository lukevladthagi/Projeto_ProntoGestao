// ES module stub for @better-auth/kysely-adapter
// We use Neon PostgreSQL pool directly, so this adapter is not needed.
// These stubs satisfy the imports from better-auth internals.

export default {};

// Imported by better-auth/dist/context/init.mjs
export const getKyselyDatabaseType = () => 'postgres';

// Imported by better-auth/dist/db/get-migration.mjs
export const createKyselyAdapter = () => ({});

// Other possible imports
export const kyselyAdapter = undefined;
export const BunSqliteDialect = undefined;
export const D1Dialect = undefined;
export const NodeSqliteDialect = undefined;
export const DEFAULT_MIGRATION_TABLE = '__better_auth_migrations';
export const DEFAULT_MIGRATION_LOCK_TABLE = '__better_auth_migration_lock';
