package canon

import (
	"testing"
)

func TestCanonicalizeSortsKeys(t *testing.T) {
	input := `{"z":"last","a":"first","m":"middle"}`
	got, err := Canonicalize([]byte(input))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	want := `{"a":"first","m":"middle","z":"last"}`
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

func TestCanonicalizeNestedObjects(t *testing.T) {
	input := `{"b":{"d":1,"c":2},"a":3}`
	got, err := Canonicalize([]byte(input))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	want := `{"a":3,"b":{"c":2,"d":1}}`
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

func TestCanonicalizeNull(t *testing.T) {
	input := `{"key":null}`
	got, err := Canonicalize([]byte(input))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	want := `{"key":null}`
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

func TestCanonicalizeBooleans(t *testing.T) {
	input := `{"b":true,"a":false}`
	got, err := Canonicalize([]byte(input))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	want := `{"a":false,"b":true}`
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

func TestCanonicalizeArray(t *testing.T) {
	input := `[3,1,2]`
	got, err := Canonicalize([]byte(input))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	want := `[3,1,2]` // Arrays preserve order per RFC 8785.
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

func TestCanonicalizeStringsEscaping(t *testing.T) {
	input := `{"key":"line1\nline2\ttab"}`
	got, err := Canonicalize([]byte(input))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	want := `{"key":"line1\nline2\ttab"}`
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

func TestCanonicalizeRemovesWhitespace(t *testing.T) {
	input := `{
		"b" : 2 ,
		"a" : 1
	}`
	got, err := Canonicalize([]byte(input))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	want := `{"a":1,"b":2}`
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

func TestCanonicalizeIntegers(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{`{"n":0}`, `{"n":0}`},
		{`{"n":1}`, `{"n":1}`},
		{`{"n":-1}`, `{"n":-1}`},
		{`{"n":1000000}`, `{"n":1000000}`},
	}
	for _, tc := range tests {
		got, err := Canonicalize([]byte(tc.input))
		if err != nil {
			t.Fatalf("Canonicalize(%s): %v", tc.input, err)
		}
		if string(got) != tc.want {
			t.Errorf("Canonicalize(%s) = %s, want %s", tc.input, got, tc.want)
		}
	}
}

func TestCanonicalizeEmptyObject(t *testing.T) {
	got, err := Canonicalize([]byte(`{}`))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	if string(got) != "{}" {
		t.Errorf("got %s, want {}", got)
	}
}

func TestCanonicalizeEmptyArray(t *testing.T) {
	got, err := Canonicalize([]byte(`[]`))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	if string(got) != "[]" {
		t.Errorf("got %s, want []", got)
	}
}

func TestCanonicalizeInvalidJSON(t *testing.T) {
	_, err := Canonicalize([]byte(`{invalid`))
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

// RFC 8785 test vector: Unicode sorting.
func TestCanonicalizeUnicodeSorting(t *testing.T) {
	// Keys with different Unicode code points should sort correctly.
	input := `{"b":"B","a":"A","c":"C"}`
	got, err := Canonicalize([]byte(input))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	want := `{"a":"A","b":"B","c":"C"}`
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}

// ES6 Number → String edge cases per ECMA-262 §7.1.12.1.
func TestCanonicalizeES6Numbers(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		// Negative zero → "0".
		{`{"n":-0}`, `{"n":0}`},
		{`{"n":-0.0}`, `{"n":0}`},
		// Fixed notation boundaries (exp ∈ [−6, 20]).
		{`{"n":1e6}`, `{"n":1000000}`},
		{`{"n":1e20}`, `{"n":100000000000000000000}`},
		{`{"n":1e-5}`, `{"n":0.00001}`},
		{`{"n":1e-6}`, `{"n":0.000001}`},
		// Scientific notation (exp < −6 or exp ≥ 21).
		{`{"n":1e-7}`, `{"n":1e-7}`},
		{`{"n":1e21}`, `{"n":1e+21}`},
		// Fractional values.
		{`{"n":0.5}`, `{"n":0.5}`},
		{`{"n":1.5}`, `{"n":1.5}`},
		{`{"n":3.14}`, `{"n":3.14}`},
		// Negative values.
		{`{"n":-42}`, `{"n":-42}`},
		{`{"n":-3.14}`, `{"n":-3.14}`},
	}
	for _, tc := range tests {
		got, err := Canonicalize([]byte(tc.input))
		if err != nil {
			t.Fatalf("Canonicalize(%s): %v", tc.input, err)
		}
		if string(got) != tc.want {
			t.Errorf("Canonicalize(%s) = %s, want %s", tc.input, got, tc.want)
		}
	}
}

// Matches the pattern used by lib/agent-dna.ts for prompt hashing.
func TestCanonicalizeSystemPromptPattern(t *testing.T) {
	input := `{"systemPrompt":"You are a test agent."}`
	got, err := Canonicalize([]byte(input))
	if err != nil {
		t.Fatalf("Canonicalize: %v", err)
	}
	want := `{"systemPrompt":"You are a test agent."}`
	if string(got) != want {
		t.Errorf("got %s, want %s", got, want)
	}
}
