// Cross-implementation parity tests for RFC 8785 canonicalization.
//
// Golden values are produced by the npm `canonicalize` package (v2.x),
// which is the canonical RFC 8785 reference used by lib/agent-dna.ts.
// If any of these tests fail, the Go canon package has diverged from the
// npm implementation — all downstream hashes will be invalid.
package canon

import (
	"testing"
)

var canonParityTests = []struct {
	name  string
	input string
	want  string
}{
	{
		name:  "simple prompt object",
		input: `{"systemPrompt": "Be helpful."}`,
		want:  `{"systemPrompt":"Be helpful."}`,
	},
	{
		name:  "prompt object - Focus on evidence",
		input: `{"systemPrompt":"Focus on evidence."}`,
		want:  `{"systemPrompt":"Focus on evidence."}`,
	},
	{
		name:  "manifest with null fields sorted alphabetically",
		input: `{"agentId":"agent-1","name":"Test Agent","systemPrompt":"Be helpful.","presetId":null,"tier":"free","model":null,"responseLength":"standard","responseFormat":"plain","createdAt":"2026-02-08T00:00:00.000Z","parentId":null,"ownerId":null}`,
		want:  `{"agentId":"agent-1","createdAt":"2026-02-08T00:00:00.000Z","model":null,"name":"Test Agent","ownerId":null,"parentId":null,"presetId":null,"responseFormat":"plain","responseLength":"standard","systemPrompt":"Be helpful.","tier":"free"}`,
	},
	{
		name:  "manifest agent-3 sorted",
		input: `{"agentId":"agent-3","name":"Hashy","systemPrompt":"Deterministic output.","presetId":null,"tier":"custom","model":null,"responseLength":"short","responseFormat":"json","createdAt":"2026-02-08T00:00:00.000Z","parentId":null,"ownerId":null}`,
		want:  `{"agentId":"agent-3","createdAt":"2026-02-08T00:00:00.000Z","model":null,"name":"Hashy","ownerId":null,"parentId":null,"presetId":null,"responseFormat":"json","responseLength":"short","systemPrompt":"Deterministic output.","tier":"custom"}`,
	},
	{
		name:  "nested object key sorting",
		input: `{"z":"last","a":"first","m":{"zz":"deep","aa":"deeper"}}`,
		want:  `{"a":"first","m":{"aa":"deeper","zz":"deep"},"z":"last"}`,
	},
	{
		name:  "array order preserved",
		input: `{"items":["c","a","b"]}`,
		want:  `{"items":["c","a","b"]}`,
	},
	{
		name:  "mixed types",
		input: `{"bool": true, "null": null, "num": 42, "str": "hello"}`,
		want:  `{"bool":true,"null":null,"num":42,"str":"hello"}`,
	},
	{
		name:  "empty object",
		input: `{}`,
		want:  `{}`,
	},
	{
		name:  "empty array",
		input: `[]`,
		want:  `[]`,
	},
	{
		name:  "whitespace collapsed",
		input: "{\n  \"a\": 1,\n  \"b\": 2\n}",
		want:  `{"a":1,"b":2}`,
	},
	{
		name:  "unicode string passthrough",
		input: `{"emoji":"🔥","text":"café"}`,
		want:  `{"emoji":"🔥","text":"café"}`,
	},
}

func TestCanonicalizeParity(t *testing.T) {
	for _, tc := range canonParityTests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Canonicalize([]byte(tc.input))
			if err != nil {
				t.Fatalf("Canonicalize(%q): %v", tc.input, err)
			}
			if string(got) != tc.want {
				t.Errorf("Canonicalize(%q)\n  got:  %s\n  want: %s", tc.input, string(got), tc.want)
			}
		})
	}
}
