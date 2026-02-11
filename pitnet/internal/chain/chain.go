// Package chain provides a minimal Ethereum JSON-RPC client for interacting
// with the EAS contract on Base L2. It implements only the methods needed for
// attestation submission and verification — no full Ethereum client.
//
// The EAS contract on Base uses pre-deployed addresses:
//
//	EAS: 0x4200000000000000000000000000000000000021
//	Schema Registry: 0x4200000000000000000000000000000000000020
//
// This client speaks raw JSON-RPC over HTTP to avoid pulling in heavy
// Ethereum libraries. For attestation submission it calls eth_sendRawTransaction;
// for verification it calls eth_call against the EAS contract's getAttestation.
package chain

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync/atomic"
	"time"
)

// Base L2 constants.
const (
	DefaultRPCURL         = "https://mainnet.base.org"
	DefaultChainID        = 8453
	EASContractAddress    = "0x4200000000000000000000000000000000000021"
	SchemaRegistryAddress = "0x4200000000000000000000000000000000000020"

	// EAS function selectors (first 4 bytes of keccak256 of function signature).
	// attest((bytes32,((address,uint64,bool,bytes32,bytes,uint256))))
	AttestSelector = "0xf17325e7"
	// getAttestation(bytes32) returns the Attestation struct
	GetAttestationSelector = "0xa3112a64"
)

// Config holds the chain client configuration.
type Config struct {
	RPCURL    string
	ChainID   int
	SchemaUID string // the registered schema UID on EAS

	// Optional: signer private key for submitting attestations.
	// Only needed for submit; verify/status work without it.
	SignerKey *ecdsa.PrivateKey
}

// Client is a minimal Ethereum JSON-RPC client.
type Client struct {
	cfg    Config
	http   *http.Client
	nextID atomic.Int64
}

// New creates a new chain client.
func New(cfg Config) *Client {
	if cfg.RPCURL == "" {
		cfg.RPCURL = DefaultRPCURL
	}
	if cfg.ChainID == 0 {
		cfg.ChainID = DefaultChainID
	}
	return &Client{
		cfg: cfg,
		http: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// rpcRequest is a JSON-RPC 2.0 request.
type rpcRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
	ID      int64         `json:"id"`
}

// rpcResponse is a JSON-RPC 2.0 response.
type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int64           `json:"id"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (e *rpcError) Error() string {
	return fmt.Sprintf("RPC error %d: %s", e.Code, e.Message)
}

// Call executes a JSON-RPC method.
func (c *Client) Call(ctx context.Context, method string, params ...interface{}) (json.RawMessage, error) {
	id := c.nextID.Add(1)

	req := rpcRequest{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
		ID:      id,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.cfg.RPCURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var rpcResp rpcResponse
	if err := json.Unmarshal(respBody, &rpcResp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	if rpcResp.Error != nil {
		return nil, rpcResp.Error
	}

	return rpcResp.Result, nil
}

// BlockNumber returns the latest block number.
func (c *Client) BlockNumber(ctx context.Context) (uint64, error) {
	result, err := c.Call(ctx, "eth_blockNumber")
	if err != nil {
		return 0, err
	}

	var hexNum string
	if err := json.Unmarshal(result, &hexNum); err != nil {
		return 0, fmt.Errorf("unmarshal block number: %w", err)
	}

	return parseHexUint64(hexNum)
}

// ChainID returns the chain ID from the node.
func (c *Client) ChainID(ctx context.Context) (uint64, error) {
	result, err := c.Call(ctx, "eth_chainId")
	if err != nil {
		return 0, err
	}

	var hexNum string
	if err := json.Unmarshal(result, &hexNum); err != nil {
		return 0, fmt.Errorf("unmarshal chain id: %w", err)
	}

	return parseHexUint64(hexNum)
}

// Attestation represents an on-chain EAS attestation record.
type Attestation struct {
	UID            string `json:"uid"`
	Schema         string `json:"schema"`
	Time           uint64 `json:"time"`
	ExpirationTime uint64 `json:"expirationTime"`
	Revocable      bool   `json:"revocable"`
	RefUID         string `json:"refUID"`
	Recipient      string `json:"recipient"`
	Attester       string `json:"attester"`
	Data           []byte `json:"data"`
}

// GetAttestation retrieves an attestation by UID from the EAS contract.
// It uses eth_call to read the on-chain state without submitting a transaction.
func (c *Client) GetAttestation(ctx context.Context, uid string) (*Attestation, error) {
	if !isValidBytes32(uid) {
		return nil, fmt.Errorf("invalid attestation UID: %q", uid)
	}

	// ABI-encode the call: getAttestation(bytes32 uid)
	// Function selector (4 bytes) + uid (32 bytes, zero-padded)
	uidBytes, _ := hex.DecodeString(uid[2:])
	callData := GetAttestationSelector + hex.EncodeToString(padLeft(uidBytes, 32))

	type ethCallParams struct {
		To   string `json:"to"`
		Data string `json:"data"`
	}

	result, err := c.Call(ctx, "eth_call",
		ethCallParams{
			To:   EASContractAddress,
			Data: callData,
		},
		"latest",
	)
	if err != nil {
		return nil, fmt.Errorf("eth_call getAttestation: %w", err)
	}

	var hexData string
	if err := json.Unmarshal(result, &hexData); err != nil {
		return nil, fmt.Errorf("unmarshal call result: %w", err)
	}

	return decodeAttestation(hexData, uid)
}

// decodeAttestation parses the ABI-encoded return value of getAttestation.
// The EAS contract returns a tuple:
//
//	(bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime,
//	 uint64 revocationTime, bytes32 refUID, address recipient,
//	 address attester, bool revocable, bytes data)
func decodeAttestation(hexData string, uid string) (*Attestation, error) {
	hexData = strings.TrimPrefix(hexData, "0x")

	// Check if all zeros (attestation not found — EAS returns zeroed struct).
	allZero := len(hexData) == 0
	if !allZero {
		allZero = true
		for _, c := range hexData {
			if c != '0' {
				allZero = false
				break
			}
		}
	}
	if allZero {
		return nil, fmt.Errorf("attestation not found: %s", uid)
	}

	if len(hexData) < 64*8 { // minimum: 8 fixed slots
		return nil, fmt.Errorf("response too short: %d hex chars", len(hexData))
	}

	readSlot := func(idx int) string {
		start := idx * 64
		end := start + 64
		if end > len(hexData) {
			return strings.Repeat("0", 64)
		}
		return hexData[start:end]
	}

	readAddress := func(idx int) string {
		slot := readSlot(idx)
		// Address is in the last 20 bytes (40 hex chars).
		return "0x" + slot[24:]
	}

	readUint64 := func(idx int) uint64 {
		slot := readSlot(idx)
		n, _ := parseHexUint64("0x" + slot)
		return n
	}

	// The getAttestation return is wrapped in a dynamic tuple.
	// Slot 0: offset to the tuple data (usually 0x20 = 32).
	// Then the tuple fields follow sequentially from that offset.
	offsetSlot := readSlot(0)
	tupleOffset, _ := parseHexUint64("0x" + offsetSlot)
	base := int(tupleOffset) / 32 // convert byte offset to slot index

	// Now read the tuple fields relative to base.
	uidHex := "0x" + readSlot(base+0)
	schemaHex := "0x" + readSlot(base+1)
	time_ := readUint64(base + 2)
	expTime := readUint64(base + 3)
	// slot base+4: revocationTime (we don't expose this)
	refUID := "0x" + readSlot(base+5)
	recipient := readAddress(base + 6)
	attester := readAddress(base + 7)
	revocable := readUint64(base+8) != 0

	// Slot base+9: offset to the dynamic `bytes data` field (relative to base).
	dataOffsetSlot := readSlot(base + 9)
	dataByteOffset, _ := parseHexUint64("0x" + dataOffsetSlot)
	// This offset is relative to the start of the tuple, so add base.
	dataSlotBase := base + int(dataByteOffset)/32

	// First slot at dataSlotBase is the length.
	dataLen := readUint64(dataSlotBase)
	dataStart := (dataSlotBase + 1) * 64 // hex chars
	dataEnd := dataStart + int(dataLen)*2
	if dataEnd > len(hexData) {
		dataEnd = len(hexData)
	}
	var attData []byte
	if dataStart < len(hexData) {
		attData, _ = hex.DecodeString(hexData[dataStart:dataEnd])
	}

	return &Attestation{
		UID:            uidHex,
		Schema:         schemaHex,
		Time:           time_,
		ExpirationTime: expTime,
		Revocable:      revocable,
		RefUID:         refUID,
		Recipient:      recipient,
		Attester:       attester,
		Data:           attData,
	}, nil
}

// GetTransactionReceipt returns the status and block number for a tx hash.
type TxReceipt struct {
	Status      uint64 `json:"status"` // 1 = success, 0 = reverted
	BlockNumber uint64 `json:"blockNumber"`
	GasUsed     uint64 `json:"gasUsed"`
}

// GetTransactionReceipt fetches the receipt for a transaction hash.
func (c *Client) GetTransactionReceipt(ctx context.Context, txHash string) (*TxReceipt, error) {
	if !isValidBytes32(txHash) {
		return nil, fmt.Errorf("invalid transaction hash: %q", txHash)
	}

	result, err := c.Call(ctx, "eth_getTransactionReceipt", txHash)
	if err != nil {
		return nil, err
	}

	// null result means tx not found.
	if string(result) == "null" {
		return nil, fmt.Errorf("transaction not found: %s", txHash)
	}

	var raw struct {
		Status      string `json:"status"`
		BlockNumber string `json:"blockNumber"`
		GasUsed     string `json:"gasUsed"`
	}
	if err := json.Unmarshal(result, &raw); err != nil {
		return nil, fmt.Errorf("unmarshal receipt: %w", err)
	}

	status, _ := parseHexUint64(raw.Status)
	blockNum, _ := parseHexUint64(raw.BlockNumber)
	gasUsed, _ := parseHexUint64(raw.GasUsed)

	return &TxReceipt{
		Status:      status,
		BlockNumber: blockNum,
		GasUsed:     gasUsed,
	}, nil
}

// RPCURL returns the configured RPC URL.
func (c *Client) RPCURL() string {
	return c.cfg.RPCURL
}

// Config returns the client configuration.
func (c *Client) Config() Config {
	return c.cfg
}

// parseHexUint64 converts a 0x-prefixed hex string to uint64.
func parseHexUint64(s string) (uint64, error) {
	s = strings.TrimPrefix(s, "0x")
	s = strings.TrimPrefix(s, "0X")
	if s == "" {
		return 0, nil
	}
	n := new(big.Int)
	_, ok := n.SetString(s, 16)
	if !ok {
		return 0, fmt.Errorf("invalid hex: %q", s)
	}
	return n.Uint64(), nil
}

// padLeft pads bytes to the specified length with leading zeros.
func padLeft(b []byte, size int) []byte {
	if len(b) >= size {
		return b[:size]
	}
	padded := make([]byte, size)
	copy(padded[size-len(b):], b)
	return padded
}

// isValidBytes32 validates a 0x-prefixed 32-byte hex string.
func isValidBytes32(s string) bool {
	if len(s) != 66 || !strings.HasPrefix(s, "0x") {
		return false
	}
	_, err := hex.DecodeString(s[2:])
	return err == nil
}
