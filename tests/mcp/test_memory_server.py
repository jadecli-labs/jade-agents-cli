"""Tests for the FastMCP knowledge graph memory server."""

from __future__ import annotations

import os
import tempfile

import pytest


@pytest.fixture
def memory_file() -> str:
    """Provide a clean temp file for JSONL storage."""
    fd, path = tempfile.mkstemp(suffix=".jsonl")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
async def memory_server(memory_file: str):
    """Create a memory server instance with a temp storage file."""
    from jade.mcp.memory_server import create_memory_server

    server = create_memory_server(memory_file_path=memory_file)
    return server


class TestMemoryServerTools:
    """The memory server must expose all 9 knowledge graph tools."""

    @pytest.mark.asyncio
    async def test_server_has_create_entities_tool(self, memory_server) -> None:
        tools = await memory_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "create_entities" in tool_names

    @pytest.mark.asyncio
    async def test_server_has_create_relations_tool(self, memory_server) -> None:
        tools = await memory_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "create_relations" in tool_names

    @pytest.mark.asyncio
    async def test_server_has_add_observations_tool(self, memory_server) -> None:
        tools = await memory_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "add_observations" in tool_names

    @pytest.mark.asyncio
    async def test_server_has_delete_entities_tool(self, memory_server) -> None:
        tools = await memory_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "delete_entities" in tool_names

    @pytest.mark.asyncio
    async def test_server_has_delete_observations_tool(self, memory_server) -> None:
        tools = await memory_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "delete_observations" in tool_names

    @pytest.mark.asyncio
    async def test_server_has_delete_relations_tool(self, memory_server) -> None:
        tools = await memory_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "delete_relations" in tool_names

    @pytest.mark.asyncio
    async def test_server_has_read_graph_tool(self, memory_server) -> None:
        tools = await memory_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "read_graph" in tool_names

    @pytest.mark.asyncio
    async def test_server_has_search_nodes_tool(self, memory_server) -> None:
        tools = await memory_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "search_nodes" in tool_names

    @pytest.mark.asyncio
    async def test_server_has_open_nodes_tool(self, memory_server) -> None:
        tools = await memory_server.list_tools()
        tool_names = [t.name for t in tools]
        assert "open_nodes" in tool_names

    @pytest.mark.asyncio
    async def test_server_exposes_exactly_9_tools(self, memory_server) -> None:
        tools = await memory_server.list_tools()
        assert len(tools) == 9


class TestMemoryServerOperations:
    """Test CRUD operations on the knowledge graph."""

    @pytest.mark.asyncio
    async def test_create_entities(self, memory_server) -> None:
        result = await memory_server.call_tool(
            "create_entities",
            {"entities": [{"name": "Alex", "entityType": "Person", "observations": ["Human partner"]}]},
        )
        assert result is not None

    @pytest.mark.asyncio
    async def test_create_relations(self, memory_server) -> None:
        await memory_server.call_tool(
            "create_entities",
            {
                "entities": [
                    {"name": "Alex", "entityType": "Person", "observations": []},
                    {"name": "use-tdd", "entityType": "Decision", "observations": ["Decided to use TDD"]},
                ]
            },
        )
        result = await memory_server.call_tool(
            "create_relations",
            {"relations": [{"from": "Alex", "to": "use-tdd", "relationType": "made_decision"}]},
        )
        assert result is not None

    @pytest.mark.asyncio
    async def test_add_observations_to_existing_entity(self, memory_server) -> None:
        await memory_server.call_tool(
            "create_entities",
            {"entities": [{"name": "Alex", "entityType": "Person", "observations": ["Human partner"]}]},
        )
        result = await memory_server.call_tool(
            "add_observations",
            {"observations": [{"entityName": "Alex", "contents": ["Uses uv for Python"]}]},
        )
        assert result is not None

    @pytest.mark.asyncio
    async def test_search_nodes_returns_matches(self, memory_server) -> None:
        await memory_server.call_tool(
            "create_entities",
            {"entities": [{"name": "Alex", "entityType": "Person", "observations": ["Human partner in Jade"]}]},
        )
        result = await memory_server.call_tool("search_nodes", {"query": "Alex"})
        assert result is not None
        # Result should contain the entity
        result_text = str(result)
        assert "Alex" in result_text

    @pytest.mark.asyncio
    async def test_read_graph_returns_full_graph(self, memory_server) -> None:
        await memory_server.call_tool(
            "create_entities",
            {"entities": [{"name": "TestEntity", "entityType": "Concept", "observations": ["A test"]}]},
        )
        result = await memory_server.call_tool("read_graph", {})
        assert result is not None
        result_text = str(result)
        assert "TestEntity" in result_text

    @pytest.mark.asyncio
    async def test_open_nodes_returns_specific_entity(self, memory_server) -> None:
        await memory_server.call_tool(
            "create_entities",
            {"entities": [{"name": "SpecificNode", "entityType": "Tool", "observations": ["A specific tool"]}]},
        )
        result = await memory_server.call_tool("open_nodes", {"names": ["SpecificNode"]})
        assert result is not None
        result_text = str(result)
        assert "SpecificNode" in result_text

    @pytest.mark.asyncio
    async def test_delete_entities_removes_data(self, memory_server) -> None:
        await memory_server.call_tool(
            "create_entities",
            {"entities": [{"name": "ToDelete", "entityType": "Concept", "observations": ["Will be deleted"]}]},
        )
        await memory_server.call_tool("delete_entities", {"entityNames": ["ToDelete"]})
        result = await memory_server.call_tool("search_nodes", {"query": "ToDelete"})
        result_text = str(result)
        # After deletion, entity should not appear in search
        assert "ToDelete" not in result_text or "entities" not in result_text.lower()


class TestMemoryServerPersistence:
    """JSONL file persistence: write → restart → read back."""

    @pytest.mark.asyncio
    async def test_data_persists_to_jsonl_file(self, memory_file: str) -> None:
        from jade.mcp.memory_server import create_memory_server

        server = create_memory_server(memory_file_path=memory_file)
        await server.call_tool(
            "create_entities",
            {"entities": [{"name": "Persisted", "entityType": "Concept", "observations": ["Should persist"]}]},
        )
        # File should now contain data
        assert os.path.getsize(memory_file) > 0

    @pytest.mark.asyncio
    async def test_data_survives_server_restart(self, memory_file: str) -> None:
        from jade.mcp.memory_server import create_memory_server

        # Write with first server instance
        server1 = create_memory_server(memory_file_path=memory_file)
        await server1.call_tool(
            "create_entities",
            {"entities": [{"name": "Survivor", "entityType": "Concept", "observations": ["Must survive restart"]}]},
        )

        # Read with fresh server instance
        server2 = create_memory_server(memory_file_path=memory_file)
        result = await server2.call_tool("search_nodes", {"query": "Survivor"})
        result_text = str(result)
        assert "Survivor" in result_text
