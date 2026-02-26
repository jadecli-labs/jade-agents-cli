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


class TestCorruptJSONLRecovery:
    """C1: Corrupt lines in JSONL must not kill the entire load."""

    @pytest.mark.asyncio
    async def test_corrupt_line_skipped_valid_lines_loaded(self, memory_file: str) -> None:
        """A bad JSON line between two valid lines should be skipped."""
        import json

        # Write a JSONL file with a corrupt line in the middle
        with open(memory_file, "w", encoding="utf-8") as f:
            f.write(
                json.dumps({"type": "entity", "name": "Good1", "entityType": "Concept", "observations": ["ok"]}) + "\n"
            )
            f.write("NOT_VALID_JSON_AT_ALL\n")
            f.write(
                json.dumps({"type": "entity", "name": "Good2", "entityType": "Concept", "observations": ["also ok"]})
                + "\n"
            )

        from jade.mcp.memory_server import create_memory_server

        server = create_memory_server(memory_file_path=memory_file)
        result = await server.call_tool("read_graph", {})
        result_text = str(result)
        assert "Good1" in result_text
        assert "Good2" in result_text

    @pytest.mark.asyncio
    async def test_all_corrupt_lines_results_in_empty_graph(self, memory_file: str) -> None:
        with open(memory_file, "w", encoding="utf-8") as f:
            f.write("bad line 1\n")
            f.write("{not json\n")

        from jade.mcp.memory_server import create_memory_server

        server = create_memory_server(memory_file_path=memory_file)
        result = await server.call_tool("read_graph", {})
        result_text = str(result)
        assert '"entities": []' in result_text


class TestObservationMergeOrder:
    """C3: Observation merging must preserve insertion order, not scramble via set()."""

    @pytest.mark.asyncio
    async def test_merge_preserves_insertion_order(self, memory_file: str) -> None:
        from jade.mcp.memory_server import create_memory_server

        server = create_memory_server(memory_file_path=memory_file)
        await server.call_tool(
            "create_entities",
            {"entities": [{"name": "OrderTest", "entityType": "Concept", "observations": ["alpha", "beta"]}]},
        )
        await server.call_tool(
            "add_observations",
            {"observations": [{"entityName": "OrderTest", "contents": ["beta", "gamma"]}]},
        )
        result = await server.call_tool("open_nodes", {"names": ["OrderTest"]})
        result_text = str(result)
        # After merge: ["alpha", "beta", "gamma"] — beta deduplicated, order preserved
        alpha_pos = result_text.index("alpha")
        beta_pos = result_text.index("beta")
        gamma_pos = result_text.index("gamma")
        assert alpha_pos < beta_pos < gamma_pos

    @pytest.mark.asyncio
    async def test_duplicate_observations_removed(self, memory_file: str) -> None:
        import json

        from jade.mcp.memory_server import create_memory_server

        server = create_memory_server(memory_file_path=memory_file)
        await server.call_tool(
            "create_entities",
            {"entities": [{"name": "DupTest", "entityType": "Concept", "observations": ["x", "y"]}]},
        )
        await server.call_tool(
            "add_observations",
            {"observations": [{"entityName": "DupTest", "contents": ["x", "y", "z"]}]},
        )
        result = await server.call_tool("open_nodes", {"names": ["DupTest"]})
        # Extract JSON from FastMCP tuple: result[1]["result"] is the raw JSON string
        parsed = json.loads(result[1]["result"])
        obs = parsed["entities"][0]["observations"]
        assert len(obs) == 3
        assert obs == ["x", "y", "z"]


class TestAddObservationsNotFound:
    """H6: add_observations must report entities that don't exist."""

    @pytest.mark.asyncio
    async def test_notfound_returned_for_missing_entity(self, memory_file: str) -> None:
        import json

        from jade.mcp.memory_server import create_memory_server

        server = create_memory_server(memory_file_path=memory_file)
        result = await server.call_tool(
            "add_observations",
            {"observations": [{"entityName": "NonExistent", "contents": ["test"]}]},
        )
        parsed = json.loads(result[1]["result"])
        assert "notFound" in parsed
        assert "NonExistent" in parsed["notFound"]

    @pytest.mark.asyncio
    async def test_notfound_absent_when_all_entities_exist(self, memory_file: str) -> None:
        import json

        from jade.mcp.memory_server import create_memory_server

        server = create_memory_server(memory_file_path=memory_file)
        await server.call_tool(
            "create_entities",
            {"entities": [{"name": "Exists", "entityType": "Concept", "observations": []}]},
        )
        result = await server.call_tool(
            "add_observations",
            {"observations": [{"entityName": "Exists", "contents": ["new obs"]}]},
        )
        parsed = json.loads(result[1]["result"])
        assert "notFound" not in parsed


class TestMemoryFilePathValidation:
    """M9: memory_file_path must be resolved and validated."""

    def test_rejects_non_jsonl_extension(self) -> None:
        from jade.mcp.memory_server import create_memory_server

        with pytest.raises(ValueError, match="must end with .jsonl"):
            create_memory_server(memory_file_path="/tmp/bad.json")
