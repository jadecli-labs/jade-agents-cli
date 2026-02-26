---
paths:
  - "src/**/*.py"
  - "tests/**/*.py"
---

# Python Rules

- Use `uv run` to execute Python commands (not raw `python` or `pip`)
- ruff enforces: E, F, I, N, W, UP, B, SIM, TCH rules
- MCP tool parameters: camelCase with `# noqa: N803` on the parameter line
- Frozen dataclasses for config: `@dataclass(frozen=True)` with `__post_init__` validation
- pytest-asyncio with `asyncio_mode = "auto"` — no `@pytest.mark.asyncio` needed
- Use `pytest.raises((ValueError, TypeError))` not bare `pytest.raises(Exception)` (ruff B017)
- Use `zip(a, b, strict=True)` not bare `zip(a, b)` (ruff B905)
