package cmd

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	"github.com/rickhallett/thepit/pitnet/internal/abi"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunSubmit encodes an attestation payload for an agent manifest.
// In the current implementation, it ABI-encodes the data and prints
// the hex-encoded calldata. Full on-chain submission (signing and
// broadcasting a transaction) requires a signer key and is planned
// for a future release.
func RunSubmit(args []string) {
	var (
		agentID      string
		name         string
		presetID     string
		tier         string
		promptHash   string
		manifestHash string
		parentID     string
		ownerID      string
		createdAt    uint64
		jsonFile     string
	)

	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--agent-id":
			if i+1 < len(args) {
				agentID = args[i+1]
				i++
			}
		case "--name":
			if i+1 < len(args) {
				name = args[i+1]
				i++
			}
		case "--preset-id":
			if i+1 < len(args) {
				presetID = args[i+1]
				i++
			}
		case "--tier":
			if i+1 < len(args) {
				tier = args[i+1]
				i++
			}
		case "--prompt-hash":
			if i+1 < len(args) {
				promptHash = args[i+1]
				i++
			}
		case "--manifest-hash":
			if i+1 < len(args) {
				manifestHash = args[i+1]
				i++
			}
		case "--parent-id":
			if i+1 < len(args) {
				parentID = args[i+1]
				i++
			}
		case "--owner-id":
			if i+1 < len(args) {
				ownerID = args[i+1]
				i++
			}
		case "--created-at":
			if i+1 < len(args) {
				v, err := strconv.ParseUint(args[i+1], 10, 64)
				if err != nil {
					fmt.Fprintf(os.Stderr, "%s --created-at must be a unix timestamp\n", theme.Error.Render("error:"))
					os.Exit(1)
				}
				createdAt = v
				i++
			}
		case "--json", "-j":
			if i+1 < len(args) {
				jsonFile = args[i+1]
				i++
			}
		}
	}

	// If a JSON file is provided, load fields from it.
	if jsonFile != "" {
		data, err := os.ReadFile(jsonFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "%s reading %s: %v\n", theme.Error.Render("error:"), jsonFile, err)
			os.Exit(1)
		}
		var manifest struct {
			AgentID      string `json:"agentId"`
			Name         string `json:"name"`
			PresetID     string `json:"presetId"`
			Tier         string `json:"tier"`
			PromptHash   string `json:"promptHash"`
			ManifestHash string `json:"manifestHash"`
			ParentID     string `json:"parentId"`
			OwnerID      string `json:"ownerId"`
			CreatedAt    uint64 `json:"createdAt"`
		}
		if err := json.Unmarshal(data, &manifest); err != nil {
			fmt.Fprintf(os.Stderr, "%s parsing JSON: %v\n", theme.Error.Render("error:"), err)
			os.Exit(1)
		}
		if agentID == "" {
			agentID = manifest.AgentID
		}
		if name == "" {
			name = manifest.Name
		}
		if presetID == "" {
			presetID = manifest.PresetID
		}
		if tier == "" {
			tier = manifest.Tier
		}
		if promptHash == "" {
			promptHash = manifest.PromptHash
		}
		if manifestHash == "" {
			manifestHash = manifest.ManifestHash
		}
		if parentID == "" {
			parentID = manifest.ParentID
		}
		if ownerID == "" {
			ownerID = manifest.OwnerID
		}
		if createdAt == 0 {
			createdAt = manifest.CreatedAt
		}
	}

	// Validate required fields.
	if agentID == "" || name == "" || promptHash == "" || manifestHash == "" {
		fmt.Fprintf(os.Stderr, "%s submit requires --agent-id, --name, --prompt-hash, --manifest-hash\n",
			theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitnet submit --agent-id <id> --name <name> --prompt-hash <hash> --manifest-hash <hash> [flags]\n")
		fmt.Fprintf(os.Stderr, "         pitnet submit --json <manifest.json>\n\n")
		os.Exit(1)
	}

	if !abi.IsValidBytes32(promptHash) {
		fmt.Fprintf(os.Stderr, "%s invalid prompt hash: %s\n", theme.Error.Render("error:"), promptHash)
		os.Exit(1)
	}
	if !abi.IsValidBytes32(manifestHash) {
		fmt.Fprintf(os.Stderr, "%s invalid manifest hash: %s\n", theme.Error.Render("error:"), manifestHash)
		os.Exit(1)
	}

	attData := abi.AttestationData{
		AgentID:      agentID,
		Name:         name,
		PresetID:     presetID,
		Tier:         tier,
		PromptHash:   promptHash,
		ManifestHash: manifestHash,
		ParentID:     parentID,
		OwnerID:      ownerID,
		CreatedAt:    createdAt,
	}

	encoded, err := abi.Encode(attData)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s encoding attestation data: %v\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	fmt.Printf("\n  %s\n\n", theme.Title.Render("Attestation Payload"))
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("agentId:"), agentID)
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("name:"), name)
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("tier:"), tier)
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("promptHash:"), promptHash)
	fmt.Printf("  %-22s %s\n", theme.Muted.Render("manifestHash:"), manifestHash)
	fmt.Printf("  %-22s %d bytes\n\n", theme.Muted.Render("encoded size:"), len(encoded))

	fmt.Printf("  %s\n\n", theme.Bold.Render("ABI-Encoded Data"))
	fmt.Printf("  0x%s\n\n", hex.EncodeToString(encoded))

	fmt.Printf("  %s\n", theme.Warning.Render("Note: Full on-chain submission requires EAS_SIGNER_PRIVATE_KEY."))
	fmt.Printf("  %s\n\n", theme.Muted.Render("Use this encoded data with the EAS contract's attest() function."))
}
