---
paths:
  - "src/jade/mcp/**/*.py"
  - "ts/mcp/**/*.ts"
  - "worker/**/*.ts"
---

# MCP Protocol Rules

- All MCP tool parameters use **camelCase** (e.g., `entityName`, `sessionId`)
- Python: suppress ruff N803 on camelCase params with `# noqa: N803`
- FastMCP `call_tool` returns `(list[TextContent], dict)` tuple — use `_extract_text()` helper
- Memory server: 9 tools (create_entities, create_relations, add_observations, delete_entity, delete_relation, read_entities, search_entities, get_entity_by_name, list_relations)
- Jade server: 4 tools (record_decision, recall_context, update_hot_memory, log_insight)
