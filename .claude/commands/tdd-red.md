# TDD Red Phase — Write Failing Tests

Write tests for a new feature. Tests should fail because the implementation doesn't exist yet.

## Instructions

1. Ask what feature or module to test (if not specified).
2. Create test file(s) following existing patterns:
   - Python: `tests/<module>/test_<name>.py`
   - TypeScript: `ts/tests/<module>/<name>.test.ts`
3. Write comprehensive tests covering happy path, edge cases, and error cases.
4. Use existing fakes/mocks pattern (FakeRedis, _FakeStore, etc.) — no external services.
5. Run the tests — they should all FAIL (red phase).
6. Report which tests were created and confirm they fail.
