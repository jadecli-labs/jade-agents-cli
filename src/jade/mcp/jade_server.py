"""Jade-specific MCP tools — higher-level operations on the knowledge graph.

Provides domain-specific tools: record_decision, recall_context,
update_hot_memory, log_insight.
"""

from __future__ import annotations

import json

from mcp.server.fastmcp import FastMCP

from jade.mcp.memory_server import KnowledgeGraph


def create_jade_server(
    memory_file_path: str = "./memory.jsonl",
    graph: KnowledgeGraph | None = None,
) -> FastMCP:
    """Create a Jade-specific MCP server with domain tools."""
    mcp = FastMCP("jade-tools")
    if graph is None:
        graph = KnowledgeGraph(file_path=memory_file_path)
        graph.load()

    @mcp.tool()
    def record_decision(
        decisionName: str,  # noqa: N803
        rationale: str,
        decidedBy: str,  # noqa: N803
        sessionId: str,  # noqa: N803
    ) -> str:
        """Record a decision with its rationale, creating entity + relations + observations."""
        if not decisionName or not decisionName.strip():
            msg = "decisionName must be a non-empty string"
            raise ValueError(msg)

        # Create decision entity
        graph.entities.append(
            {
                "name": decisionName,
                "entityType": "Decision",
                "observations": [rationale],
            }
        )

        # Create person entity if not exists
        if not graph.find_entity(decidedBy):
            graph.entities.append(
                {
                    "name": decidedBy,
                    "entityType": "Person",
                    "observations": [],
                }
            )

        # Create session entity if not exists
        if not graph.find_entity(sessionId):
            graph.entities.append(
                {
                    "name": sessionId,
                    "entityType": "Session",
                    "observations": [],
                }
            )

        # Create relations
        graph.relations.append(
            {
                "from": decidedBy,
                "to": decisionName,
                "relationType": "made_decision",
            }
        )
        graph.relations.append(
            {
                "from": decisionName,
                "to": sessionId,
                "relationType": "participated_in",
            }
        )

        graph.save()
        return json.dumps(
            {
                "status": "recorded",
                "decision": decisionName,
                "decidedBy": decidedBy,
                "session": sessionId,
            }
        )

    @mcp.tool()
    def recall_context(query: str) -> str:
        """Search the knowledge graph by session, date, or topic."""
        query_lower = query.lower()
        matches = []
        for e in graph.entities:
            if (
                query_lower in e["name"].lower()
                or query_lower in e.get("entityType", "").lower()
                or any(query_lower in obs.lower() for obs in e.get("observations", []))
            ):
                matches.append(e)
        related = [r for r in graph.relations if any(r["from"] == m["name"] or r["to"] == m["name"] for m in matches)]
        return json.dumps({"entities": matches, "relations": related})

    @mcp.tool()
    def update_hot_memory(
        sessionId: str,  # noqa: N803
        summary: str,
        activeThreads: list[str] | None = None,  # noqa: N803
    ) -> str:
        """Write a session summary to the knowledge graph as hot memory."""
        # Create or update session entity
        session = graph.find_entity(sessionId)
        if session:
            merged = session.get("observations", []) + [summary]
            session["observations"] = list(dict.fromkeys(merged))
        else:
            graph.entities.append(
                {
                    "name": sessionId,
                    "entityType": "Session",
                    "observations": [summary],
                }
            )

        # Record active threads as observations
        if activeThreads:
            session = graph.find_entity(sessionId)
            if session:
                for thread in activeThreads:
                    if thread not in session.get("observations", []):
                        session["observations"].append(f"Active thread: {thread}")

        graph.save()
        return json.dumps(
            {
                "status": "updated",
                "session": sessionId,
                "summaryLength": len(summary),
                "activeThreads": activeThreads or [],
            }
        )

    @mcp.tool()
    def log_insight(
        insight: str,
        category: str = "Concept",
        sessionId: str = "",  # noqa: N803
    ) -> str:
        """Record an observation or learning as a concept entity."""
        # Create a name from the insight (slug-ify first few words)
        words = insight.split()[:5]
        name = "-".join(w.lower().strip(".,!?") for w in words)

        graph.entities.append(
            {
                "name": name,
                "entityType": category,
                "observations": [insight],
            }
        )

        if sessionId:
            graph.relations.append(
                {
                    "from": name,
                    "to": sessionId,
                    "relationType": "participated_in",
                }
            )

        graph.save()
        return json.dumps(
            {
                "status": "logged",
                "name": name,
                "category": category,
                "insight": insight,
            }
        )

    return mcp
