// Test setup for bun test
// Loaded before every test file via bunfig.toml preload

// Ensure test environment
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}
