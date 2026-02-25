"""Tests for Jade-specific MCP tools — higher-level operations on the knowledge graph."""

from __future__ import annotations

import os
import tempfile

import pytest


@pytest.fixture
def memory_file() -> str:
    fd, path = tempfile.mkstemp(suffix=".jsonl")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
async def jade_server(memory_file: str):
    from jade.mcp.jade_server import create_jade_server

    server = create_jade_server(memory_file_path=memory_file)
    return server


class TestJadeServerTools:
    """Jade server exposes domain-specific tools."""

    @pytest.mark.asyncio
    async def test_has_record_decision_tool(self, jade_server) -> None:
        tools = await jade_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "record_decision" in tool_names

    @pytest.mark.asyncio
    async def test_has_recall_context_tool(self, jade_server) -> None:
        tools = await jade_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "recall_context" in tool_names

    @pytest.mark.asyncio
    async def test_has_update_hot_memory_tool(self, jade_server) -> None:
        tools = await jade_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "update_hot_memory" in tool_names

    @pytest.mark.asyncio
    async def test_has_log_insight_tool(self, jade_server) -> None:
        tools = await jade_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "log_insight" in tool_names


class TestRecordDecision:
    """record_decision creates entity + relations + observations atomically."""

    @pytest.mark.asyncio
    async def test_record_decision_creates_decision_entity(self, jade_server) -> None:
        result = await jade_server.call_tool(
            "record_decision",
            {
                "decisionName": "use-tdd-approach",
                "rationale": "TDD ensures correctness before implementation",
                "decidedBy": "Alex",
                "sessionId": "session-001",
            },
        )
        assert result is not None
        result_text = str(result)
        assert "use-tdd-approach" in result_text

    @pytest.mark.asyncio
    async def test_record_decision_requires_decision_name(self, jade_server) -> None:
        with pytest.raises((ValueError, TypeError, Exception)):
            await jade_server.call_tool(
                "record_decision",
                {"decisionName": "", "rationale": "test", "decidedBy": "Alex", "sessionId": "s1"},
            )


class TestRecallContext:
    """recall_context searches the knowledge graph by session, date, or topic."""

    @pytest.mark.asyncio
    async def test_recall_context_by_topic(self, jade_server) -> None:
        # First record something
        await jade_server.call_tool(
            "record_decision",
            {
                "decisionName": "use-redis-for-hot-memory",
                "rationale": "Redis provides fast session-scoped state",
                "decidedBy": "Alex",
                "sessionId": "session-001",
            },
        )
        result = await jade_server.call_tool("recall_context", {"query": "redis"})
        assert result is not None
        result_text = str(result)
        assert "redis" in result_text.lower()


class TestUpdateHotMemory:
    """update_hot_memory writes a session summary."""

    @pytest.mark.asyncio
    async def test_update_hot_memory_writes_summary(self, jade_server) -> None:
        result = await jade_server.call_tool(
            "update_hot_memory",
            {
                "sessionId": "session-001",
                "summary": "Discussed TDD approach and Redis hot memory design",
                "activeThreads": ["TDD implementation", "Redis integration"],
            },
        )
        assert result is not None


class TestLogInsight:
    """log_insight records an observation or learning."""

    @pytest.mark.asyncio
    async def test_log_insight_creates_concept_entity(self, jade_server) -> None:
        result = await jade_server.call_tool(
            "log_insight",
            {
                "insight": "FastMCP decorators simplify MCP server creation",
                "category": "Concept",
                "sessionId": "session-001",
            },
        )
        assert result is not None
