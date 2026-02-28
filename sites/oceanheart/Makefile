# oceanheart.ai — Hugo build wrapper
# Syncs data files from repo root before build

HUGO := hugo
ROOT := ../..
DATA := data/slopodar.yaml
SOURCE_DATA := $(ROOT)/slopodar.yaml
SD_SOURCE := $(ROOT)/docs/internal/session-decisions.md
SD_TARGET := data/decisions.json
STUBS_DIR := content/slopodar

.PHONY: build serve clean sync stubs decisions sd-stubs

sync: stubs decisions sd-stubs
	@cp $(SOURCE_DATA) $(DATA)
	@echo "synced slopodar.yaml"

stubs:
	@mkdir -p $(STUBS_DIR)
	@awk '\
	  /^  - id:/ { id = $$3 } \
	  /^    name:/ { \
	    name = $$0; \
	    sub(/^    name: *"?/, "", name); \
	    sub(/"? *$$/, "", name); \
	    f = "$(STUBS_DIR)/" id ".md"; \
	    printf "+++\ntitle = \"%s\"\nid = \"%s\"\ntype = \"slopodar\"\n+++\n", name, id > f; \
	    close(f); \
	  }' $(SOURCE_DATA)
	@echo "generated slopodar stubs"

decisions:
	@awk '\
	  BEGIN { print "["; sep="" } \
	  /^\| SD-[0-9]+/ { \
	    id = $$0; sub(/^\| */, "", id); sub(/ *\|.*/, "", id); \
	    decision = $$0; \
	    sub(/^\| *SD-[0-9]+ *\| */, "", decision); \
	    sub(/ *\| *[^|]* *\| *[^|]* *\|$$/, "", decision); \
	    gsub(/\\/, "\\\\", decision); \
	    gsub(/"/, "\\\"", decision); \
	    gsub(/\t/, " ", decision); \
	    status = $$0; \
	    n = split($$0, cols, "|"); \
	    st = cols[n-1]; sub(/^ */, "", st); sub(/ *$$/, "", st); \
	    printf "%s\n{\"id\":\"%s\",\"decision\":\"%s\",\"status\":\"%s\"}", sep, id, decision, st; \
	    sep = ","; \
	  } \
	  END { print "\n]" }' $(SD_SOURCE) > $(SD_TARGET)
	@echo "extracted decisions"

sd-stubs: decisions
	@mkdir -p content/decisions
	@python3 -c 'import json;[open("content/decisions/"+d["id"].lower()+".md","w").write("+++\ntitle = \""+d["id"]+"\"\nid = \""+d["id"]+"\"\ntype = \"decisions\"\n+++\n") for d in json.load(open("$(SD_TARGET)"))]'
	@echo "generated sd stubs"

build: sync
	$(HUGO)

serve: sync
	$(HUGO) server --bind 0.0.0.0 --port 1313

clean:
	rm -rf public resources
