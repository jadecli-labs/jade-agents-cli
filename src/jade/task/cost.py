"""Token cost calculator for Claude models.

Pure math — no API calls. Uses official Anthropic pricing as of Feb 2026.
Supports standard context, long context (>200K), and prompt caching multipliers.
"""

from __future__ import annotations

from dataclasses import dataclass

from jade.task.spec import ModelTier, TokenUsage


@dataclass(frozen=True)
class ModelPricing:
    """Per-million-token pricing for a Claude model tier."""

    input_per_mtok: float
    output_per_mtok: float
    cache_write_per_mtok: float  # 1.25x base input (5-min TTL)
    cache_read_per_mtok: float  # 0.1x base input


# Official Anthropic pricing — Feb 2026
PRICING: dict[ModelTier, ModelPricing] = {
    ModelTier.OPUS: ModelPricing(
        input_per_mtok=5.00,
        output_per_mtok=25.00,
        cache_write_per_mtok=6.25,
        cache_read_per_mtok=0.50,
    ),
    ModelTier.SONNET: ModelPricing(
        input_per_mtok=3.00,
        output_per_mtok=15.00,
        cache_write_per_mtok=3.75,
        cache_read_per_mtok=0.30,
    ),
    ModelTier.HAIKU: ModelPricing(
        input_per_mtok=1.00,
        output_per_mtok=5.00,
        cache_write_per_mtok=1.25,
        cache_read_per_mtok=0.10,
    ),
}

# Long context (>200K input) multipliers
LONG_CONTEXT_INPUT_MULTIPLIER = 2.0
LONG_CONTEXT_OUTPUT_MULTIPLIER = 1.5
LONG_CONTEXT_THRESHOLD = 200_000


def calculate_cost(usage: TokenUsage, tier: ModelTier, long_context: bool = False) -> float:
    """Calculate USD cost from token usage and model tier.

    Args:
        usage: Actual token counts from an API call.
        tier: Which model tier was used.
        long_context: Whether the request exceeded 200K input tokens.

    Returns:
        Cost in USD (float).
    """
    pricing = PRICING[tier]
    mtok = 1_000_000

    input_rate = pricing.input_per_mtok
    output_rate = pricing.output_per_mtok

    if long_context:
        input_rate *= LONG_CONTEXT_INPUT_MULTIPLIER
        output_rate *= LONG_CONTEXT_OUTPUT_MULTIPLIER

    cost = (
        usage.input_tokens * input_rate / mtok
        + usage.output_tokens * output_rate / mtok
        + usage.cache_creation_input_tokens * pricing.cache_write_per_mtok / mtok
        + usage.cache_read_input_tokens * pricing.cache_read_per_mtok / mtok
    )

    return round(cost, 6)


def estimate_cost(input_tokens: int, output_tokens: int, tier: ModelTier) -> float:
    """Estimate cost before making an API call (no cache info).

    Args:
        input_tokens: Estimated input token count.
        output_tokens: Estimated output token count.
        tier: Target model tier.

    Returns:
        Estimated cost in USD.
    """
    pricing = PRICING[tier]
    mtok = 1_000_000

    input_rate = pricing.input_per_mtok
    output_rate = pricing.output_per_mtok

    if input_tokens > LONG_CONTEXT_THRESHOLD:
        input_rate *= LONG_CONTEXT_INPUT_MULTIPLIER
        output_rate *= LONG_CONTEXT_OUTPUT_MULTIPLIER

    cost = input_tokens * input_rate / mtok + output_tokens * output_rate / mtok
    return round(cost, 6)


def format_cost(cost_usd: float) -> str:
    """Format cost as human-readable string."""
    if cost_usd < 0.01:
        return f"${cost_usd:.4f}"
    return f"${cost_usd:.2f}"


def format_usage_summary(usage: TokenUsage, tier: ModelTier) -> str:
    """Format token usage and cost as a one-line summary."""
    cost = calculate_cost(usage, tier)
    parts = [
        f"{usage.total_tokens:,} tokens",
        f"({usage.total_input_tokens:,} in + {usage.output_tokens:,} out)",
        format_cost(cost),
    ]
    if usage.cache_read_input_tokens > 0:
        parts.append(f"({usage.cache_read_input_tokens:,} cached)")
    return " · ".join(parts)
