"""Tests for the JSON parser — extraction, validation, error handling."""

import json

from piteval.parser import _extract_json


class TestJsonExtraction:
    def test_plain_json_passes_through(self):
        raw = '{"key": "value"}'
        assert _extract_json(raw) == raw

    def test_markdown_fences_stripped(self):
        raw = '```json\n{"key": "value"}\n```'
        assert _extract_json(raw) == '{"key": "value"}'

    def test_markdown_fences_without_language_stripped(self):
        raw = '```\n{"key": "value"}\n```'
        assert _extract_json(raw) == '{"key": "value"}'

    def test_preamble_before_json_stripped(self):
        raw = 'Here is the evaluation:\n\n{"key": "value"}'
        result = _extract_json(raw)
        parsed = json.loads(result)
        assert parsed == {"key": "value"}

    def test_trailing_content_after_json_stripped(self):
        raw = '{"key": "value"}\n\nHope this helps!'
        result = _extract_json(raw)
        parsed = json.loads(result)
        assert parsed == {"key": "value"}

    def test_nested_braces_handled(self):
        raw = '{"outer": {"inner": "value"}}'
        result = _extract_json(raw)
        parsed = json.loads(result)
        assert parsed["outer"]["inner"] == "value"

    def test_strings_with_braces_not_confused(self):
        raw = '{"text": "a { b } c"}'
        result = _extract_json(raw)
        parsed = json.loads(result)
        assert parsed["text"] == "a { b } c"

    def test_empty_input_returns_empty(self):
        assert _extract_json("") == ""
        assert _extract_json("   ") == ""
