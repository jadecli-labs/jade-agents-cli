"""Tests for the token cost calculator.

Pure math — no API calls needed. Tests pricing for all model tiers,
cache multipliers, and long context surcharges.
"""

from __future__ import annotations

from jade.task.cost import (
    PRICING,
    calculate_cost,
    estimate_cost,
    format_cost,
    format_usage_summary,
)
from jade.task.spec import ModelTier, TokenUsage


class TestCalculateCost:
    """Cost calculation from actual token usage."""

    def test_sonnet_basic(self) -> None:
        usage = TokenUsage(input_tokens=1000, output_tokens=500)
        cost = calculate_cost(usage, ModelTier.SONNET)
        # 1000 * 3.00/1M + 500 * 15.00/1M = 0.003 + 0.0075 = 0.0105
        assert cost == 0.0105

    def test_opus_basic(self) -> None:
        usage = TokenUsage(input_tokens=1000, output_tokens=500)
        cost = calculate_cost(usage, ModelTier.OPUS)
        # 1000 * 5.00/1M + 500 * 25.00/1M = 0.005 + 0.0125 = 0.0175
        assert cost == 0.0175

    def test_haiku_basic(self) -> None:
        usage = TokenUsage(input_tokens=1000, output_tokens=500)
        cost = calculate_cost(usage, ModelTier.HAIKU)
        # 1000 * 1.00/1M + 500 * 5.00/1M = 0.001 + 0.0025 = 0.0035
        assert cost == 0.0035

    def test_cache_write_cost(self) -> None:
        usage = TokenUsage(input_tokens=0, output_tokens=0, cache_creation_input_tokens=1_000_000)
        cost = calculate_cost(usage, ModelTier.SONNET)
        # 1M * 3.75/1M = 3.75
        assert cost == 3.75

    def test_cache_read_cost(self) -> None:
        usage = TokenUsage(input_tokens=0, output_tokens=0, cache_read_input_tokens=1_000_000)
        cost = calculate_cost(usage, ModelTier.SONNET)
        # 1M * 0.30/1M = 0.30
        assert cost == 0.30

    def test_cache_read_90_percent_discount(self) -> None:
        """Cache reads should be 10% of base input price (90% savings)."""
        base_usage = TokenUsage(input_tokens=1_000_000)
        cached_usage = TokenUsage(cache_read_input_tokens=1_000_000)
        base_cost = calculate_cost(base_usage, ModelTier.OPUS)
        cached_cost = calculate_cost(cached_usage, ModelTier.OPUS)
        assert cached_cost == base_cost * 0.1

    def test_long_context_multiplier(self) -> None:
        usage = TokenUsage(input_tokens=1000, output_tokens=500)
        normal = calculate_cost(usage, ModelTier.SONNET, long_context=False)
        long = calculate_cost(usage, ModelTier.SONNET, long_context=True)
        # Long context: input 2x, output 1.5x
        # Normal: 0.003 + 0.0075 = 0.0105
        # Long: 0.006 + 0.01125 = 0.01725
        assert long > normal
        assert long == 0.01725

    def test_zero_usage(self) -> None:
        usage = TokenUsage()
        cost = calculate_cost(usage, ModelTier.OPUS)
        assert cost == 0.0

    def test_mixed_cache_and_regular(self) -> None:
        usage = TokenUsage(
            input_tokens=500,
            output_tokens=200,
            cache_creation_input_tokens=300,
            cache_read_input_tokens=1000,
        )
        cost = calculate_cost(usage, ModelTier.OPUS)
        # 500*5/1M + 200*25/1M + 300*6.25/1M + 1000*0.50/1M
        # = 0.0025 + 0.005 + 0.001875 + 0.0005 = 0.009875
        assert cost == 0.009875


class TestEstimateCost:
    """Pre-call cost estimation (no cache data)."""

    def test_sonnet_estimate(self) -> None:
        cost = estimate_cost(10_000, 2_000, ModelTier.SONNET)
        # 10000*3/1M + 2000*15/1M = 0.03 + 0.03 = 0.06
        assert cost == 0.06

    def test_long_context_auto_detected(self) -> None:
        """Requests >200K input tokens get long context pricing."""
        normal = estimate_cost(100_000, 1_000, ModelTier.SONNET)
        long = estimate_cost(300_000, 1_000, ModelTier.SONNET)
        # 300K exceeds threshold → 2x input, 1.5x output
        assert long > normal * 2


class TestFormatCost:
    """Human-readable cost formatting."""

    def test_small_cost(self) -> None:
        assert format_cost(0.0035) == "$0.0035"

    def test_larger_cost(self) -> None:
        assert format_cost(1.50) == "$1.50"

    def test_penny_threshold(self) -> None:
        assert format_cost(0.01) == "$0.01"

    def test_sub_penny(self) -> None:
        assert format_cost(0.009) == "$0.0090"


class TestFormatUsageSummary:
    """One-line usage summary with tokens and cost."""

    def test_basic_summary(self) -> None:
        usage = TokenUsage(input_tokens=1000, output_tokens=500)
        summary = format_usage_summary(usage, ModelTier.SONNET)
        assert "1,500 tokens" in summary
        assert "1,000 in" in summary
        assert "500 out" in summary

    def test_cached_summary(self) -> None:
        usage = TokenUsage(input_tokens=100, output_tokens=50, cache_read_input_tokens=900)
        summary = format_usage_summary(usage, ModelTier.SONNET)
        assert "900 cached" in summary

    def test_includes_cost(self) -> None:
        usage = TokenUsage(input_tokens=1000, output_tokens=500)
        summary = format_usage_summary(usage, ModelTier.OPUS)
        assert "$" in summary


class TestPricingCompleteness:
    """All model tiers have pricing defined."""

    def test_all_tiers_have_pricing(self) -> None:
        for tier in ModelTier:
            assert tier in PRICING
            p = PRICING[tier]
            assert p.input_per_mtok > 0
            assert p.output_per_mtok > 0
            assert p.cache_write_per_mtok > 0
            assert p.cache_read_per_mtok > 0
