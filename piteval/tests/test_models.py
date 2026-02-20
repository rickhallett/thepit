"""Tests for model configurations and panel definitions."""

from piteval.models import (
    ALL_MODELS,
    CLAUDE,
    GEMINI,
    GPT,
    PANELS,
    TOTAL_METRICS,
    get_model,
    get_panel,
)


class TestModelConfigs:
    def test_three_models_defined(self):
        assert len(ALL_MODELS) == 3

    def test_models_have_distinct_providers(self):
        providers = {m.provider for m in ALL_MODELS}
        assert len(providers) == 3, "Each model should use a different provider"

    def test_all_models_have_api_keys_configured(self):
        for model in ALL_MODELS:
            assert model.env_var, f"{model.display_name} missing env_var"
            assert model.env_var.endswith("_API_KEY") or model.env_var.endswith("_KEY")

    def test_temperature_center_within_reasonable_range(self):
        for model in ALL_MODELS:
            assert 0.3 <= model.temperature_center <= 1.0, (
                f"{model.display_name} center={model.temperature_center} is outside [0.3, 1.0]"
            )

    def test_temperatures_computed_from_center_and_offsets(self):
        for model in ALL_MODELS:
            temps = model.temperatures
            assert len(temps) == len(model.temperature_offsets)
            for t in temps:
                assert 0.0 <= t <= 2.0, f"Temperature {t} out of range for {model.display_name}"

    def test_temperature_for_iteration_wraps_correctly(self):
        temps = CLAUDE.temperatures
        # Iteration 1 maps to index 0, iteration 6 wraps to index 0
        assert CLAUDE.temperature_for_iteration(1) == temps[0]
        assert CLAUDE.temperature_for_iteration(len(temps) + 1) == temps[0]

    def test_context_windows_are_realistic(self):
        for model in ALL_MODELS:
            assert model.context_window >= 100_000, (
                f"{model.display_name} context window too small: {model.context_window}"
            )

    def test_get_model_by_display_name(self):
        assert get_model("Claude Sonnet 4.6") is CLAUDE
        assert get_model("GPT-5.2") is GPT

    def test_get_model_by_api_id(self):
        assert get_model("claude-sonnet-4-6") is CLAUDE

    def test_claude_has_1m_context_window(self):
        assert CLAUDE.context_window == 1_000_000

    def test_claude_long_context_pricing_configured(self):
        assert CLAUDE.long_context_threshold == 200_000
        assert CLAUDE.long_context_input_cost_per_mtok == 6.0  # 2x standard
        assert CLAUDE.long_context_output_cost_per_mtok == 22.5  # 1.5x standard

    def test_gpt_and_gemini_have_no_long_context_premium(self):
        for model in [GPT, GEMINI]:
            assert model.long_context_threshold == 0, (
                f"{model.display_name} should have no long-context threshold"
            )

    def test_get_model_unknown_raises(self):
        try:
            get_model("nonexistent-model")
            raise AssertionError("Should have raised ValueError")
        except ValueError:
            pass


class TestPanelDefinitions:
    def test_twelve_evaluation_panels(self):
        assert len(PANELS) == 12

    def test_panel_ids_are_sequential_101_to_112(self):
        ids = [p.panel_id for p in PANELS]
        assert ids == [str(i) for i in range(101, 113)]

    def test_total_metrics_is_94(self):
        assert TOTAL_METRICS == 94

    def test_every_panel_has_required_sections(self):
        for panel in PANELS:
            assert len(panel.required_sections) > 0, (
                f"Panel {panel.panel_id} has no required sections"
            )

    def test_section_ids_are_valid(self):
        valid = set("ABCDEFG")
        for panel in PANELS:
            for s in panel.required_sections:
                assert s in valid, f"Panel {panel.panel_id} has invalid section: {s}"
            for s in panel.optional_sections:
                assert s in valid, f"Panel {panel.panel_id} has invalid optional section: {s}"

    def test_get_panel_returns_correct_panel(self):
        p = get_panel("101")
        assert p.name == "Architecture & Systems Design"
        assert p.metric_count == 8

    def test_get_panel_113_returns_aggregation(self):
        p = get_panel("113")
        assert "Aggregation" in p.name

    def test_get_panel_unknown_raises(self):
        try:
            get_panel("999")
            raise AssertionError("Should have raised ValueError")
        except ValueError:
            pass
