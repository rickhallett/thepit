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
	"io"
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
	// Reject trailing data after the first JSON value.
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return nil, fmt.Errorf("parsing JSON: trailing data after top-level value")
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
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return fmt.Errorf("parsing number %q: %w", s, err)
	}
	buf.WriteString(formatES6Number(f))
	return nil
}

// formatES6Number formats a float64 using ECMAScript Number → String rules
// (ECMA-262 §7.1.12.1). Fixed notation is used when the decimal exponent n
// satisfies −6 < n ≤ 21; otherwise scientific notation is used. Negative
// zero is normalised to "0" per RFC 8785.
func formatES6Number(f float64) string {
	// ES6 / RFC 8785: −0 → "0".
	if f == 0 {
		return "0"
	}

	// Produce the shortest scientific representation that round-trips.
	sci := strconv.FormatFloat(f, 'e', -1, 64)
	parts := strings.SplitN(sci, "e", 2)
	mant, expStr := parts[0], parts[1]
	exp, _ := strconv.Atoi(expStr)

	sign := ""
	if strings.HasPrefix(mant, "-") {
		sign = "-"
		mant = mant[1:]
	}

	// Strip the decimal point to get the raw digit string.
	digits := strings.ReplaceAll(mant, ".", "")

	// ES6: fixed notation when −6 ≤ exp ≤ 20.
	if exp >= -6 && exp <= 20 {
		pos := exp + 1 // number of digits before the decimal point
		switch {
		case pos <= 0:
			// e.g. 1e-6 → "0.000001"
			return sign + "0." + strings.Repeat("0", -pos) + digits
		case pos >= len(digits):
			// e.g. 1e6 → "1000000"
			return sign + digits + strings.Repeat("0", pos-len(digits))
		default:
			return sign + digits[:pos] + "." + digits[pos:]
		}
	}

	// Scientific notation with normalised exponent (no leading zeros, no
	// positive sign suppression — ES6 uses e+N / e-N).
	return sign + normalizeExponent(sci)
}

// normalizeExponent removes leading zeros from the exponent to match ES6 formatting.
// Go's 'g' format emits at least two exponent digits (e.g., "e+06"); ES6 requires
// no leading zeros (e.g., "e+6").
func normalizeExponent(s string) string {
	if i := strings.IndexByte(s, 'e'); i != -1 {
		head, exp := s[:i+1], s[i+1:]
		if len(exp) > 0 && (exp[0] == '+' || exp[0] == '-') {
			sign := exp[0]
			exp = strings.TrimLeft(exp[1:], "0")
			if exp == "" {
				exp = "0"
			}
			return head + string(sign) + exp
		}
	}
	return s
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
