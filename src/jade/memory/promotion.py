"""Hot→cold promotion logic.

Moves session data from Redis to Neon with embeddings.
Idempotent: skips already-promoted entities.
"""

from __future__ import annotations

from dataclasses import dataclass

from jade.memory.cold import ColdMemoryClient  # noqa: TC001
from jade.memory.embeddings import EmbeddingPipeline  # noqa: TC001
from jade.memory.hot import HotMemoryClient  # noqa: TC001


@dataclass
class PromotionResult:
    """Result of a promotion operation."""

    promoted_count: int = 0
    skipped_count: int = 0


class PromotionService:
    """Promotes session data from hot (Redis) to cold (Neon/pgvector) storage."""

    def __init__(
        self,
        hot: HotMemoryClient,
        cold: ColdMemoryClient,
        embeddings: EmbeddingPipeline,
    ) -> None:
        self._hot = hot
        self._cold = cold
        self._embeddings = embeddings

    def promote_session(self, session_id: str) -> PromotionResult:
        """Promote all entities from a session to cold storage."""
        session_data = self._hot.read_session(session_id)
        if session_data is None:
            return PromotionResult(promoted_count=0)

        entities = session_data.get("entities", [])
        result = PromotionResult()

        for entity in entities:
            name = entity.get("name", "")
            if not name:
                continue

            # Check if already promoted (idempotent)
            existing = self._cold.get_entity(name)
            if existing is not None:
                result.skipped_count += 1
                continue

            # Generate embedding from observations
            observations = entity.get("observations", [])
            text = " ".join(observations) if observations else name
            embedding = self._embeddings.embed(text)

            # Insert into cold storage
            self._cold.insert_entity(
                name=name,
                entity_type=entity.get("entityType", "Concept"),
                observations=observations,
                embedding=embedding,
            )
            result.promoted_count += 1

        return result
