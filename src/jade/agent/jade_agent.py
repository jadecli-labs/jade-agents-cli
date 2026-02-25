"""Jade Agent — Claude SDK Python agent with MCP tool integration.

Wraps the Anthropic client with MCP memory + Jade-specific tools.
Fail-fast: invalid config raises immediately.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import anthropic

from jade.mcp.jade_server import create_jade_server
from jade.mcp.memory_server import create_memory_server


@dataclass(frozen=True)
class JadeAgentConfig:
    """Immutable configuration for JadeAgent. Validates at creation time."""

    api_key: str
    model: str
    memory_file_path: str

    def __post_init__(self) -> None:
        if not self.api_key or not self.api_key.strip():
            msg = "api_key must be a non-empty string"
            raise ValueError(msg)
        if not self.model or not self.model.strip():
            msg = "model must be a non-empty string"
            raise ValueError(msg)
        if not self.memory_file_path or not self.memory_file_path.strip():
            msg = "memory_file_path must be a non-empty string"
            raise ValueError(msg)


# Tool definitions for the Anthropic Messages API
_MEMORY_TOOLS = [
    {
        "name": "create_entities",
        "description": "Create new entities in the knowledge graph.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entities": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "entityType": {"type": "string"},
                            "observations": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["name"],
                    },
                }
            },
            "required": ["entities"],
        },
    },
    {
        "name": "create_relations",
        "description": "Create relations between entities.",
        "input_schema": {
            "type": "object",
            "properties": {
                "relations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "from": {"type": "string"},
                            "to": {"type": "string"},
                            "relationType": {"type": "string"},
                        },
                        "required": ["from", "to", "relationType"],
                    },
                }
            },
            "required": ["relations"],
        },
    },
    {
        "name": "add_observations",
        "description": "Add observations to existing entities.",
        "input_schema": {
            "type": "object",
            "properties": {
                "observations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "entityName": {"type": "string"},
                            "contents": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["entityName", "contents"],
                    },
                }
            },
            "required": ["observations"],
        },
    },
    {
        "name": "delete_entities",
        "description": "Delete entities and their associated relations.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entityNames": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["entityNames"],
        },
    },
    {
        "name": "delete_observations",
        "description": "Delete specific observations from entities.",
        "input_schema": {
            "type": "object",
            "properties": {
                "deletions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "entityName": {"type": "string"},
                            "observations": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["entityName", "observations"],
                    },
                }
            },
            "required": ["deletions"],
        },
    },
    {
        "name": "delete_relations",
        "description": "Delete specific relations.",
        "input_schema": {
            "type": "object",
            "properties": {
                "relations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "from": {"type": "string"},
                            "to": {"type": "string"},
                            "relationType": {"type": "string"},
                        },
                        "required": ["from", "to", "relationType"],
                    },
                }
            },
            "required": ["relations"],
        },
    },
    {
        "name": "read_graph",
        "description": "Read the entire knowledge graph.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "search_nodes",
        "description": "Search for entities matching a query string.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "open_nodes",
        "description": "Open specific nodes by name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "names": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["names"],
        },
    },
]

_JADE_TOOLS = [
    {
        "name": "record_decision",
        "description": "Record a decision with rationale, creating entity + relations.",
        "input_schema": {
            "type": "object",
            "properties": {
                "decisionName": {"type": "string"},
                "rationale": {"type": "string"},
                "decidedBy": {"type": "string"},
                "sessionId": {"type": "string"},
            },
            "required": ["decisionName"],
        },
    },
    {
        "name": "recall_context",
        "description": "Search the knowledge graph by session, date, or topic.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "update_hot_memory",
        "description": "Write a session summary to the knowledge graph.",
        "input_schema": {
            "type": "object",
            "properties": {
                "sessionId": {"type": "string"},
                "summary": {"type": "string"},
                "activeThreads": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["sessionId", "summary"],
        },
    },
    {
        "name": "log_insight",
        "description": "Record an observation or learning as a concept.",
        "input_schema": {
            "type": "object",
            "properties": {
                "insight": {"type": "string"},
                "category": {"type": "string"},
                "sessionId": {"type": "string"},
            },
            "required": ["insight"],
        },
    },
]


class JadeAgent:
    """Claude-powered agent with MCP knowledge graph tools."""

    def __init__(self, config: JadeAgentConfig) -> None:
        self._config = config
        self.client = anthropic.Anthropic(api_key=config.api_key)
        self.model = config.model

        # Initialize MCP servers for tool execution
        self._memory_server = create_memory_server(config.memory_file_path)
        self._jade_server = create_jade_server(config.memory_file_path)

        # Build tool name → server mapping
        self._memory_tool_names = {t["name"] for t in _MEMORY_TOOLS}
        self._jade_tool_names = {t["name"] for t in _JADE_TOOLS}

    def get_tools(self) -> list[dict[str, Any]]:
        """Return all available tool definitions for the Messages API."""
        return _MEMORY_TOOLS + _JADE_TOOLS

    async def handle_tool_call(self, tool_name: str, tool_input: dict[str, Any]) -> Any:
        """Route a tool call to the correct MCP server."""
        if tool_name in self._memory_tool_names:
            return await self._call_memory_tool(tool_name, tool_input)
        if tool_name in self._jade_tool_names:
            return await self._call_jade_tool(tool_name, tool_input)
        msg = f"Unknown tool: {tool_name}"
        raise ValueError(msg)

    async def _call_memory_tool(self, name: str, args: dict[str, Any]) -> str:
        """Execute a memory server tool via direct FastMCP call."""
        result = await self._memory_server.call_tool(name, args)
        return self._extract_text(result)

    async def _call_jade_tool(self, name: str, args: dict[str, Any]) -> str:
        """Execute a Jade server tool via direct FastMCP call."""
        result = await self._jade_server.call_tool(name, args)
        return self._extract_text(result)

    @staticmethod
    def _extract_text(result: Any) -> str:
        """Extract text from FastMCP call_tool result (handles tuple/list/str)."""
        if isinstance(result, str):
            return result
        if isinstance(result, tuple):
            content_list = result[0] if result else []
            if content_list and hasattr(content_list[0], "text"):
                return content_list[0].text
        if isinstance(result, list) and result and hasattr(result[0], "text"):
            return result[0].text
        return str(result)
