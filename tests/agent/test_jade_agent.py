"""Tests for Jade agent — Claude SDK Python agent with MCP tool integration.

RED phase: these tests define the expected behavior of JadeAgent.
"""

from __future__ import annotations

import json

import pytest

# These imports will fail until GREEN phase implements them.
from jade.agent.jade_agent import JadeAgent, JadeAgentConfig


class TestJadeAgentConfig:
    """JadeAgentConfig validates configuration at creation time."""

    def test_config_requires_api_key(self) -> None:
        with pytest.raises((ValueError, TypeError)):
            JadeAgentConfig(api_key="", model="claude-sonnet-4-20250514", memory_file_path="./m.jsonl")

    def test_config_requires_model(self) -> None:
        with pytest.raises((ValueError, TypeError)):
            JadeAgentConfig(api_key="sk-test", model="", memory_file_path="./m.jsonl")

    def test_config_requires_memory_file_path(self) -> None:
        with pytest.raises((ValueError, TypeError)):
            JadeAgentConfig(api_key="sk-test", model="claude-sonnet-4-20250514", memory_file_path="")

    def test_valid_config_creates_successfully(self) -> None:
        config = JadeAgentConfig(
            api_key="sk-test",
            model="claude-sonnet-4-20250514",
            memory_file_path="./memory.jsonl",
        )
        assert config.api_key == "sk-test"
        assert config.model == "claude-sonnet-4-20250514"
        assert config.memory_file_path == "./memory.jsonl"

    def test_config_is_frozen(self) -> None:
        config = JadeAgentConfig(
            api_key="sk-test",
            model="claude-sonnet-4-20250514",
            memory_file_path="./memory.jsonl",
        )
        with pytest.raises((AttributeError, TypeError)):
            config.api_key = "other"  # type: ignore[misc]


class TestJadeAgentCreation:
    """JadeAgent initializes with config and sets up MCP tools."""

    def test_create_agent_with_valid_config(self) -> None:
        config = JadeAgentConfig(
            api_key="sk-test",
            model="claude-sonnet-4-20250514",
            memory_file_path="./memory.jsonl",
        )
        agent = JadeAgent(config)
        assert agent is not None

    def test_agent_has_anthropic_client(self) -> None:
        config = JadeAgentConfig(
            api_key="sk-test",
            model="claude-sonnet-4-20250514",
            memory_file_path="./memory.jsonl",
        )
        agent = JadeAgent(config)
        assert agent.client is not None

    def test_agent_has_model_configured(self) -> None:
        config = JadeAgentConfig(
            api_key="sk-test",
            model="claude-sonnet-4-20250514",
            memory_file_path="./memory.jsonl",
        )
        agent = JadeAgent(config)
        assert agent.model == "claude-sonnet-4-20250514"


class TestJadeAgentTools:
    """JadeAgent has MCP tools available for use."""

    def test_agent_has_tools(self) -> None:
        config = JadeAgentConfig(
            api_key="sk-test",
            model="claude-sonnet-4-20250514",
            memory_file_path="./memory.jsonl",
        )
        agent = JadeAgent(config)
        tools = agent.get_tools()
        assert isinstance(tools, list)
        assert len(tools) > 0

    def test_agent_tools_include_memory_tools(self) -> None:
        config = JadeAgentConfig(
            api_key="sk-test",
            model="claude-sonnet-4-20250514",
            memory_file_path="./memory.jsonl",
        )
        agent = JadeAgent(config)
        tool_names = {t["name"] for t in agent.get_tools()}
        assert "create_entities" in tool_names
        assert "search_nodes" in tool_names
        assert "read_graph" in tool_names

    def test_agent_tools_include_jade_tools(self) -> None:
        config = JadeAgentConfig(
            api_key="sk-test",
            model="claude-sonnet-4-20250514",
            memory_file_path="./memory.jsonl",
        )
        agent = JadeAgent(config)
        tool_names = {t["name"] for t in agent.get_tools()}
        assert "record_decision" in tool_names
        assert "recall_context" in tool_names
        assert "log_insight" in tool_names


class TestJadeAgentToolRouting:
    """JadeAgent routes tool calls to the correct MCP server."""

    @pytest.fixture
    def agent(self, clean_memory_file: str) -> JadeAgent:
        config = JadeAgentConfig(
            api_key="sk-test",
            model="claude-sonnet-4-20250514",
            memory_file_path=clean_memory_file,
        )
        return JadeAgent(config)

    @pytest.mark.asyncio
    async def test_route_memory_tool_call(self, agent: JadeAgent) -> None:
        result = await agent.handle_tool_call(
            "create_entities",
            {"entities": [{"name": "TestEntity", "entityType": "Concept", "observations": ["test"]}]},
        )
        parsed = json.loads(result) if isinstance(result, str) else result
        assert "created" in parsed

    @pytest.mark.asyncio
    async def test_route_jade_tool_call(self, agent: JadeAgent) -> None:
        result = await agent.handle_tool_call(
            "record_decision",
            {
                "decisionName": "Use TDD",
                "rationale": "Ensures quality",
                "decidedBy": "Team",
                "sessionId": "sess-1",
            },
        )
        parsed = json.loads(result) if isinstance(result, str) else result
        assert parsed.get("status") == "recorded" or "decision" in parsed

    @pytest.mark.asyncio
    async def test_unknown_tool_raises(self, agent: JadeAgent) -> None:
        with pytest.raises((ValueError, KeyError)):
            await agent.handle_tool_call("nonexistent_tool", {})


class TestJadeAgentErrorPropagation:
    """Agent propagates errors — never swallows them."""

    def test_agent_propagates_invalid_tool_params(self) -> None:
        config = JadeAgentConfig(
            api_key="sk-test",
            model="claude-sonnet-4-20250514",
            memory_file_path="./memory.jsonl",
        )
        agent = JadeAgent(config)
        # create_entities with missing required field should raise
        import asyncio

        from mcp.server.fastmcp.exceptions import ToolError

        with pytest.raises((ValueError, TypeError, RuntimeError, ToolError)):
            asyncio.get_event_loop().run_until_complete(
                agent.handle_tool_call("create_entities", {"entities": [{"name": ""}]})
            )
