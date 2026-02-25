"""Entity, Relation, and Observation schemas for Jade's knowledge graph.

Defines the core data types used by the MCP memory server.
Fail-fast validation — invalid data raises immediately.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Jade-specific entity types
JADE_ENTITY_TYPES: frozenset[str] = frozenset({
    "Person",
    "Decision",
    "Concept",
    "Tool",
    "Session",
    "Goal",
})

# Jade-specific relation types (active voice)
JADE_RELATION_TYPES: frozenset[str] = frozenset({
    "made_decision",
    "discussed_concept",
    "uses_tool",
    "has_goal",
    "participated_in",
    "related_to",
})


@dataclass(frozen=True)
class Entity:
    """A node in the knowledge graph."""

    name: str
    entity_type: str
    observations: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            msg = "Entity name must be a non-empty string"
            raise ValueError(msg)
        if not self.entity_type or not self.entity_type.strip():
            msg = "Entity entity_type must be a non-empty string"
            raise ValueError(msg)


@dataclass(frozen=True)
class Relation:
    """A directed edge between two entities."""

    from_entity: str
    to_entity: str
    relation_type: str

    def __post_init__(self) -> None:
        if not self.from_entity or not self.from_entity.strip():
            msg = "Relation from_entity must be a non-empty string"
            raise ValueError(msg)
        if not self.to_entity or not self.to_entity.strip():
            msg = "Relation to_entity must be a non-empty string"
            raise ValueError(msg)
        if not self.relation_type or not self.relation_type.strip():
            msg = "Relation relation_type must be a non-empty string"
            raise ValueError(msg)


def validate_observation(observation: str) -> bool:
    """Validate that an observation is a non-empty string. Fail fast if not."""
    if not observation or not observation.strip():
        msg = "Observation must be a non-empty string"
        raise ValueError(msg)
    return True
