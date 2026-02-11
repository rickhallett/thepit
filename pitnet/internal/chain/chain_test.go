package chain

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// newTestServer creates an httptest server that responds to JSON-RPC requests.
func newTestServer(handler func(method string, params []interface{}) (interface{}, error)) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req rpcRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		result, err := handler(req.Method, req.Params)
		if err != nil {
			resp := rpcResponse{
				JSONRPC: "2.0",
				ID:      req.ID,
				Error:   &rpcError{Code: -32000, Message: err.Error()},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		resultJSON, _ := json.Marshal(result)
		resp := rpcResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result:  resultJSON,
		}
		json.NewEncoder(w).Encode(resp)
	}))
}

func TestBlockNumber(t *testing.T) {
	srv := newTestServer(func(method string, params []interface{}) (interface{}, error) {
		if method == "eth_blockNumber" {
			return "0x1a2b3c", nil
		}
		return nil, fmt.Errorf("unknown method: %s", method)
	})
	defer srv.Close()

	c := New(Config{RPCURL: srv.URL})
	num, err := c.BlockNumber(context.Background())
	if err != nil {
		t.Fatalf("BlockNumber: %v", err)
	}
	if num != 0x1a2b3c {
		t.Errorf("BlockNumber = %d, want %d", num, 0x1a2b3c)
	}
}

func TestChainID(t *testing.T) {
	srv := newTestServer(func(method string, params []interface{}) (interface{}, error) {
		if method == "eth_chainId" {
			return "0x2105", nil // 8453 = Base mainnet
		}
		return nil, fmt.Errorf("unknown method: %s", method)
	})
	defer srv.Close()

	c := New(Config{RPCURL: srv.URL})
	id, err := c.ChainID(context.Background())
	if err != nil {
		t.Fatalf("ChainID: %v", err)
	}
	if id != 8453 {
		t.Errorf("ChainID = %d, want 8453", id)
	}
}

func TestGetAttestationNotFound(t *testing.T) {
	uid := "0x" + strings.Repeat("ab", 32)
	srv := newTestServer(func(method string, params []interface{}) (interface{}, error) {
		if method == "eth_call" {
			// Return all zeros = attestation not found.
			return "0x" + strings.Repeat("0", 640), nil
		}
		return nil, fmt.Errorf("unknown method: %s", method)
	})
	defer srv.Close()

	c := New(Config{RPCURL: srv.URL})
	_, err := c.GetAttestation(context.Background(), uid)
	if err == nil {
		t.Error("expected error for non-existent attestation")
	}
	if !strings.Contains(err.Error(), "not found") {
		t.Errorf("error should mention 'not found', got: %v", err)
	}
}

func TestGetAttestationInvalidUID(t *testing.T) {
	c := New(Config{RPCURL: "http://localhost:1"})
	_, err := c.GetAttestation(context.Background(), "invalid")
	if err == nil {
		t.Error("expected error for invalid UID")
	}
}

func TestGetTransactionReceiptNotFound(t *testing.T) {
	txHash := "0x" + strings.Repeat("cc", 32)
	srv := newTestServer(func(method string, params []interface{}) (interface{}, error) {
		if method == "eth_getTransactionReceipt" {
			return nil, nil // null result
		}
		return nil, fmt.Errorf("unknown method: %s", method)
	})
	defer srv.Close()

	c := New(Config{RPCURL: srv.URL})
	_, err := c.GetTransactionReceipt(context.Background(), txHash)
	if err == nil {
		t.Error("expected error for non-existent transaction")
	}
}

func TestGetTransactionReceiptSuccess(t *testing.T) {
	txHash := "0x" + strings.Repeat("dd", 32)
	srv := newTestServer(func(method string, params []interface{}) (interface{}, error) {
		if method == "eth_getTransactionReceipt" {
			return map[string]string{
				"status":      "0x1",
				"blockNumber": "0xff",
				"gasUsed":     "0x5208",
			}, nil
		}
		return nil, fmt.Errorf("unknown method: %s", method)
	})
	defer srv.Close()

	c := New(Config{RPCURL: srv.URL})
	receipt, err := c.GetTransactionReceipt(context.Background(), txHash)
	if err != nil {
		t.Fatalf("GetTransactionReceipt: %v", err)
	}
	if receipt.Status != 1 {
		t.Errorf("Status = %d, want 1", receipt.Status)
	}
	if receipt.BlockNumber != 255 {
		t.Errorf("BlockNumber = %d, want 255", receipt.BlockNumber)
	}
	if receipt.GasUsed != 21000 {
		t.Errorf("GasUsed = %d, want 21000", receipt.GasUsed)
	}
}

func TestGetTransactionReceiptInvalidHash(t *testing.T) {
	c := New(Config{RPCURL: "http://localhost:1"})
	_, err := c.GetTransactionReceipt(context.Background(), "bad")
	if err == nil {
		t.Error("expected error for invalid tx hash")
	}
}

func TestRPCError(t *testing.T) {
	srv := newTestServer(func(method string, params []interface{}) (interface{}, error) {
		return nil, fmt.Errorf("something went wrong")
	})
	defer srv.Close()

	c := New(Config{RPCURL: srv.URL})
	_, err := c.BlockNumber(context.Background())
	if err == nil {
		t.Error("expected RPC error")
	}
}

func TestDefaultConfig(t *testing.T) {
	c := New(Config{})
	if c.RPCURL() != DefaultRPCURL {
		t.Errorf("RPCURL = %q, want %q", c.RPCURL(), DefaultRPCURL)
	}
	cfg := c.Config()
	if cfg.ChainID != DefaultChainID {
		t.Errorf("ChainID = %d, want %d", cfg.ChainID, DefaultChainID)
	}
}

func TestParseHexUint64(t *testing.T) {
	tests := []struct {
		input string
		want  uint64
	}{
		{"0x0", 0},
		{"0x1", 1},
		{"0xff", 255},
		{"0x2105", 8453},
		{"", 0},
	}
	for _, tt := range tests {
		got, err := parseHexUint64(tt.input)
		if err != nil {
			t.Errorf("parseHexUint64(%q): %v", tt.input, err)
			continue
		}
		if got != tt.want {
			t.Errorf("parseHexUint64(%q) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

func TestIsValidBytes32(t *testing.T) {
	if !isValidBytes32("0x" + strings.Repeat("ab", 32)) {
		t.Error("should be valid")
	}
	if isValidBytes32("invalid") {
		t.Error("should be invalid")
	}
	if isValidBytes32("0x" + strings.Repeat("0", 63)) {
		t.Error("too short should be invalid")
	}
}

func TestGetAttestationSuccess(t *testing.T) {
	// Build a valid ABI-encoded getAttestation response.
	// The return is: offset-to-tuple (slot 0) + tuple fields.
	//
	// Slot 0: 0x20 (offset to tuple = 32 bytes = slot index 1)
	// Then from slot 1 (base):
	//   +0: uid (bytes32)
	//   +1: schema (bytes32)
	//   +2: time (uint64)
	//   +3: expirationTime (uint64)
	//   +4: revocationTime (uint64) - we don't expose but need it
	//   +5: refUID (bytes32)
	//   +6: recipient (address, right-aligned in 32 bytes)
	//   +7: attester (address, right-aligned in 32 bytes)
	//   +8: revocable (bool as uint256)
	//   +9: offset to dynamic bytes data (relative to base)
	//   Then: data length + data content

	uid := strings.Repeat("aa", 32)
	schema := strings.Repeat("bb", 32)
	refUID := strings.Repeat("00", 32)
	recipient := strings.Repeat("0", 24) + "1111111111111111111111111111111111111111" // 20 bytes
	attester := strings.Repeat("0", 24) + "2222222222222222222222222222222222222222"  // 20 bytes

	slot := func(hex64 string) string {
		if len(hex64) < 64 {
			hex64 = strings.Repeat("0", 64-len(hex64)) + hex64
		}
		return hex64
	}

	// Build response hex (no 0x prefix for the inner parts).
	var hex strings.Builder
	hex.WriteString(slot("20"))                                 // slot 0: offset = 32 bytes
	hex.WriteString(uid)                                        // base+0: uid
	hex.WriteString(schema)                                     // base+1: schema
	hex.WriteString(slot("65a8db80"))                           // base+2: time = 1705598848
	hex.WriteString(slot("0"))                                  // base+3: expirationTime = 0
	hex.WriteString(slot("0"))                                  // base+4: revocationTime = 0
	hex.WriteString(refUID)                                     // base+5: refUID
	hex.WriteString(recipient)                                  // base+6: recipient
	hex.WriteString(attester)                                   // base+7: attester
	hex.WriteString(slot("1"))                                  // base+8: revocable = true
	hex.WriteString(slot(fmt.Sprintf("%x", 10*32)))             // base+9: data offset (10 slots from base = 320 bytes)
	hex.WriteString(slot(fmt.Sprintf("%x", 4)))                 // data length = 4 bytes
	hex.WriteString(slot("deadbeef" + strings.Repeat("0", 56))) // data content (4 bytes padded)

	srv := newTestServer(func(method string, params []interface{}) (interface{}, error) {
		if method == "eth_call" {
			return "0x" + hex.String(), nil
		}
		return nil, fmt.Errorf("unknown method: %s", method)
	})
	defer srv.Close()

	c := New(Config{RPCURL: srv.URL})
	att, err := c.GetAttestation(context.Background(), "0x"+uid)
	if err != nil {
		t.Fatalf("GetAttestation: %v", err)
	}

	if att.UID != "0x"+uid {
		t.Errorf("UID = %q, want %q", att.UID, "0x"+uid)
	}
	if att.Schema != "0x"+schema {
		t.Errorf("Schema = %q, want %q", att.Schema, "0x"+schema)
	}
	if att.Time != 1705565056 {
		t.Errorf("Time = %d, want 1705565056", att.Time)
	}
	if att.ExpirationTime != 0 {
		t.Errorf("ExpirationTime = %d, want 0", att.ExpirationTime)
	}
	if !att.Revocable {
		t.Error("Revocable = false, want true")
	}
	if att.Recipient != "0x1111111111111111111111111111111111111111" {
		t.Errorf("Recipient = %q", att.Recipient)
	}
	if att.Attester != "0x2222222222222222222222222222222222222222" {
		t.Errorf("Attester = %q", att.Attester)
	}
	if len(att.Data) != 4 {
		t.Errorf("Data length = %d, want 4", len(att.Data))
	}
}

func TestConstants(t *testing.T) {
	if EASContractAddress != "0x4200000000000000000000000000000000000021" {
		t.Errorf("wrong EAS address: %s", EASContractAddress)
	}
	if SchemaRegistryAddress != "0x4200000000000000000000000000000000000020" {
		t.Errorf("wrong schema registry address: %s", SchemaRegistryAddress)
	}
	if DefaultChainID != 8453 {
		t.Errorf("wrong chain ID: %d", DefaultChainID)
	}
}
