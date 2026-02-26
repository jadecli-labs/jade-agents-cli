"""Tests for MCP entity/relation/observation schemas — Jade's knowledge graph types."""

from __future__ import annotations

import pytest


class TestEntitySchema:
    """Entity schema validation: name, entityType, observations."""

    def test_valid_entity_creates_successfully(self) -> None:
        from jade.mcp.entities import Entity

        entity = Entity(name="Alex", entity_type="Person", observations=["Human partner in Jade system"])
        assert entity.name == "Alex"
        assert entity.entity_type == "Person"
        assert len(entity.observations) == 1

    def test_entity_requires_name(self) -> None:
        from jade.mcp.entities import Entity

        with pytest.raises((ValueError, TypeError)):
            Entity(name="", entity_type="Person", observations=[])

    def test_entity_requires_entity_type(self) -> None:
        from jade.mcp.entities import Entity

        with pytest.raises((ValueError, TypeError)):
            Entity(name="Alex", entity_type="", observations=[])

    def test_entity_observations_default_to_empty_tuple(self) -> None:
        from jade.mcp.entities import Entity

        entity = Entity(name="Alex", entity_type="Person")
        assert entity.observations == ()

    def test_entity_with_multiple_observations(self) -> None:
        from jade.mcp.entities import Entity

        obs = ["Prefers fail-fast patterns", "Uses uv for Python", "Works on jadecli-labs"]
        entity = Entity(name="Alex", entity_type="Person", observations=obs)
        assert len(entity.observations) == 3


class TestJadeEntityTypes:
    """Jade defines specific entity types for its knowledge graph."""

    def test_jade_entity_types_exist(self) -> None:
        from jade.mcp.entities import JADE_ENTITY_TYPES

        assert "Person" in JADE_ENTITY_TYPES
        assert "Decision" in JADE_ENTITY_TYPES
        assert "Concept" in JADE_ENTITY_TYPES
        assert "Tool" in JADE_ENTITY_TYPES
        assert "Session" in JADE_ENTITY_TYPES
        assert "Goal" in JADE_ENTITY_TYPES

    def test_jade_entity_types_is_frozenset(self) -> None:
        from jade.mcp.entities import JADE_ENTITY_TYPES

        assert isinstance(JADE_ENTITY_TYPES, frozenset)


class TestRelationSchema:
    """Relation schema validation: from_entity, to_entity, relation_type."""

    def test_valid_relation_creates_successfully(self) -> None:
        from jade.mcp.entities import Relation

        rel = Relation(from_entity="Alex", to_entity="use-uv-for-python", relation_type="made_decision")
        assert rel.from_entity == "Alex"
        assert rel.to_entity == "use-uv-for-python"
        assert rel.relation_type == "made_decision"

    def test_relation_requires_from_entity(self) -> None:
        from jade.mcp.entities import Relation

        with pytest.raises((ValueError, TypeError)):
            Relation(from_entity="", to_entity="target", relation_type="uses")

    def test_relation_requires_to_entity(self) -> None:
        from jade.mcp.entities import Relation

        with pytest.raises((ValueError, TypeError)):
            Relation(from_entity="source", to_entity="", relation_type="uses")

    def test_relation_requires_relation_type(self) -> None:
        from jade.mcp.entities import Relation

        with pytest.raises((ValueError, TypeError)):
            Relation(from_entity="source", to_entity="target", relation_type="")


class TestJadeRelationTypes:
    """Jade defines specific relation types (active voice)."""

    def test_jade_relation_types_exist(self) -> None:
        from jade.mcp.entities import JADE_RELATION_TYPES

        assert "made_decision" in JADE_RELATION_TYPES
        assert "discussed_concept" in JADE_RELATION_TYPES
        assert "uses_tool" in JADE_RELATION_TYPES
        assert "has_goal" in JADE_RELATION_TYPES

    def test_jade_relation_types_is_frozenset(self) -> None:
        from jade.mcp.entities import JADE_RELATION_TYPES

        assert isinstance(JADE_RELATION_TYPES, frozenset)


class TestObservation:
    """Observations are atomic fact strings attached to entities."""

    def test_observation_is_non_empty_string(self) -> None:
        from jade.mcp.entities import validate_observation

        assert validate_observation("Alex prefers fail-fast patterns") is True

    def test_empty_observation_fails(self) -> None:
        from jade.mcp.entities import validate_observation

        with pytest.raises(ValueError, match="[Oo]bservation"):
            validate_observation("")

    def test_whitespace_only_observation_fails(self) -> None:
        from jade.mcp.entities import validate_observation

        with pytest.raises(ValueError, match="[Oo]bservation"):
            validate_observation("   ")
