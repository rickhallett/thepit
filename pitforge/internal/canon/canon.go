// Package canon implements RFC 8785 JSON Canonicalization Scheme (JCS).
// This produces byte-identical output to the npm "canonicalize" package
// used in lib/agent-dna.ts.
//
// RFC 8785 rules:
//   - Object keys are sorted lexicographically by Unicode code point
//   - No whitespace between tokens
//   - Numbers use ES6 serialization (no trailing zeros, no positive sign)
//   - Strings use minimal escaping (only required chars)
//   - null, true, false are literal
package canon

import (
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
)

// Canonicalize takes a JSON byte slice and returns the RFC 8785
// canonical form. The input must be valid JSON.
func Canonicalize(input []byte) ([]byte, error) {
	var raw interface{}
	// Use json.Number to preserve numeric precision.
	dec := json.NewDecoder(strings.NewReader(string(input)))
	dec.UseNumber()
	if err := dec.Decode(&raw); err != nil {
		return nil, fmt.Errorf("parsing JSON: %w", err)
	}

	var buf strings.Builder
	if err := writeCanonical(&buf, raw); err != nil {
		return nil, err
	}
	return []byte(buf.String()), nil
}

func writeCanonical(buf *strings.Builder, val interface{}) error {
	switch v := val.(type) {
	case nil:
		buf.WriteString("null")

	case bool:
		if v {
			buf.WriteString("true")
		} else {
			buf.WriteString("false")
		}

	case json.Number:
		// RFC 8785: use ES6 number serialization.
		return writeNumber(buf, v)

	case string:
		// RFC 8785: use standard JSON string escaping.
		writeString(buf, v)

	case []interface{}:
		buf.WriteByte('[')
		for i, item := range v {
			if i > 0 {
				buf.WriteByte(',')
			}
			if err := writeCanonical(buf, item); err != nil {
				return err
			}
		}
		buf.WriteByte(']')

	case map[string]interface{}:
		// RFC 8785: sort keys by Unicode code point (lexicographic).
		keys := make([]string, 0, len(v))
		for k := range v {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		buf.WriteByte('{')
		for i, k := range keys {
			if i > 0 {
				buf.WriteByte(',')
			}
			writeString(buf, k)
			buf.WriteByte(':')
			if err := writeCanonical(buf, v[k]); err != nil {
				return err
			}
		}
		buf.WriteByte('}')

	default:
		return fmt.Errorf("unsupported type: %T", val)
	}
	return nil
}

func writeNumber(buf *strings.Builder, n json.Number) error {
	s := n.String()

	// Try integer first.
	if i, err := strconv.ParseInt(s, 10, 64); err == nil {
		buf.WriteString(strconv.FormatInt(i, 10))
		return nil
	}

	// Float: use ES6 serialization.
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return fmt.Errorf("parsing number %q: %w", s, err)
	}

	// ES6 spec: use the shortest representation that round-trips.
	buf.WriteString(strconv.FormatFloat(f, 'f', -1, 64))
	return nil
}

func writeString(buf *strings.Builder, s string) {
	buf.WriteByte('"')
	for _, r := range s {
		switch r {
		case '"':
			buf.WriteString(`\"`)
		case '\\':
			buf.WriteString(`\\`)
		case '\b':
			buf.WriteString(`\b`)
		case '\f':
			buf.WriteString(`\f`)
		case '\n':
			buf.WriteString(`\n`)
		case '\r':
			buf.WriteString(`\r`)
		case '\t':
			buf.WriteString(`\t`)
		default:
			if r < 0x20 {
				buf.WriteString(fmt.Sprintf("\\u%04x", r))
			} else {
				buf.WriteRune(r)
			}
		}
	}
	buf.WriteByte('"')
}
