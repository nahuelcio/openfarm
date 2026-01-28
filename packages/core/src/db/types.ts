/**
 * Database instance type
 * This represents the Bun SQLite database instance used throughout the application
 */
export type Database = any;

/**
 * Database initialization state
 */
export type InitState = "uninitialized" | "initializing" | "ready" | "error";
