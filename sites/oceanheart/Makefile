# oceanheart.ai — Hugo build wrapper
# Syncs data files from repo root before build

HUGO := hugo
ROOT := ../..
DATA := data/slopodar.yaml
SOURCE_DATA := $(ROOT)/slopodar.yaml
STUBS_DIR := content/slopodar

.PHONY: build serve clean sync stubs

sync: stubs
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

build: sync
	$(HUGO)

serve: sync
	$(HUGO) server --bind 0.0.0.0 --port 1313

clean:
	rm -rf public resources
