"""FastMCP knowledge graph memory server.

Implements the 9-tool MCP memory protocol with JSONL file persistence.
Based on @modelcontextprotocol/server-memory patterns.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any

from mcp.server.fastmcp import FastMCP


@dataclass
class KnowledgeGraph:
    """In-memory knowledge graph with JSONL persistence."""

    entities: list[dict[str, Any]] = field(default_factory=list)
    relations: list[dict[str, Any]] = field(default_factory=list)
    file_path: str = "./memory.jsonl"

    def load(self) -> None:
        """Load graph from JSONL file."""
        if not os.path.exists(self.file_path):
            return
        try:
            with open(self.file_path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                    except json.JSONDecodeError:
                        continue  # Skip corrupt lines, keep loading valid ones
                    if record.get("type") == "entity":
                        # Avoid duplicates
                        existing = [e for e in self.entities if e["name"] == record["name"]]
                        if not existing:
                            self.entities.append(record)
                        else:
                            # Merge observations (preserve insertion order)
                            merged = existing[0].get("observations", []) + record.get("observations", [])
                            existing[0]["observations"] = list(dict.fromkeys(merged))
                    elif record.get("type") == "relation":
                        self.relations.append(record)
        except OSError:
            pass  # File unreadable — start with empty graph

    def save(self) -> None:
        """Save graph to JSONL file."""
        with open(self.file_path, "w", encoding="utf-8") as f:
            for entity in self.entities:
                record = {**entity, "type": "entity"}
                f.write(json.dumps(record) + "\n")
            for relation in self.relations:
                record = {**relation, "type": "relation"}
                f.write(json.dumps(record) + "\n")

    def find_entity(self, name: str) -> dict[str, Any] | None:
        for e in self.entities:
            if e["name"] == name:
                return e
        return None


def create_memory_server(memory_file_path: str = "./memory.jsonl") -> FastMCP:
    """Create a FastMCP server with all 9 knowledge graph tools."""
    mcp = FastMCP("jade-memory")
    graph = KnowledgeGraph(file_path=memory_file_path)
    graph.load()

    @mcp.tool()
    def create_entities(entities: list[dict[str, Any]]) -> str:
        """Create new entities in the knowledge graph."""
        created = []
        for e in entities:
            name = e.get("name", "")
            if not name:
                msg = "Entity name is required"
                raise ValueError(msg)
            existing = graph.find_entity(name)
            if existing:
                # Merge observations (preserve insertion order)
                merged = existing.get("observations", []) + e.get("observations", [])
                existing["observations"] = list(dict.fromkeys(merged))
            else:
                graph.entities.append(
                    {
                        "name": name,
                        "entityType": e.get("entityType", "Concept"),
                        "observations": e.get("observations", []),
                    }
                )
            created.append(name)
        graph.save()
        return json.dumps({"created": created})

    @mcp.tool()
    def create_relations(relations: list[dict[str, Any]]) -> str:
        """Create relations between entities."""
        created = []
        for r in relations:
            graph.relations.append(
                {
                    "from": r["from"],
                    "to": r["to"],
                    "relationType": r["relationType"],
                }
            )
            created.append(f"{r['from']} -> {r['to']}")
        graph.save()
        return json.dumps({"created": created})

    @mcp.tool()
    def add_observations(observations: list[dict[str, Any]]) -> str:
        """Add observations to existing entities."""
        added = []
        for obs in observations:
            entity_name = obs.get("entityName", "")
            contents = obs.get("contents", [])
            entity = graph.find_entity(entity_name)
            if entity:
                merged = entity.get("observations", []) + contents
                entity["observations"] = list(dict.fromkeys(merged))
                added.append({"entityName": entity_name, "addedCount": len(contents)})
        graph.save()
        return json.dumps({"added": added})

    @mcp.tool()
    def delete_entities(entityNames: list[str]) -> str:  # noqa: N803
        """Delete entities and their associated relations."""
        graph.entities = [e for e in graph.entities if e["name"] not in entityNames]
        graph.relations = [r for r in graph.relations if r["from"] not in entityNames and r["to"] not in entityNames]
        graph.save()
        return json.dumps({"deleted": entityNames})

    @mcp.tool()
    def delete_observations(deletions: list[dict[str, Any]]) -> str:
        """Delete specific observations from entities."""
        for d in deletions:
            entity_name = d.get("entityName", "")
            to_remove = set(d.get("observations", []))
            entity = graph.find_entity(entity_name)
            if entity:
                entity["observations"] = [o for o in entity.get("observations", []) if o not in to_remove]
        graph.save()
        return json.dumps({"status": "ok"})

    @mcp.tool()
    def delete_relations(relations: list[dict[str, Any]]) -> str:
        """Delete specific relations."""
        to_remove = {(r["from"], r["to"], r["relationType"]) for r in relations}
        graph.relations = [r for r in graph.relations if (r["from"], r["to"], r["relationType"]) not in to_remove]
        graph.save()
        return json.dumps({"status": "ok"})

    @mcp.tool()
    def read_graph() -> str:
        """Read the entire knowledge graph."""
        return json.dumps({"entities": graph.entities, "relations": graph.relations})

    @mcp.tool()
    def search_nodes(query: str) -> str:
        """Search for entities matching a query string."""
        query_lower = query.lower()
        matches = []
        for e in graph.entities:
            if (
                query_lower in e["name"].lower()
                or query_lower in e.get("entityType", "").lower()
                or any(query_lower in obs.lower() for obs in e.get("observations", []))
            ):
                matches.append(e)
        return json.dumps({"entities": matches, "relations": []})

    @mcp.tool()
    def open_nodes(names: list[str]) -> str:
        """Open specific nodes by name."""
        name_set = set(names)
        matches = [e for e in graph.entities if e["name"] in name_set]
        related = [r for r in graph.relations if r["from"] in name_set or r["to"] in name_set]
        return json.dumps({"entities": matches, "relations": related})

    return mcp
