/**
 * Vitest global setup file
 * 
 * Initializes test DATABASE_URL before running tests
 */

// For now, use in-memory mock. In production, this would connect to a test database.
// Tests that need DB should skip or use mocks until test database is configured.
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://test:test@localhost:5432/cloudmake_test';

// Make available globally
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
