# oceanheart.ai — Hugo build wrapper
# Syncs data files from repo root before build

HUGO := hugo
ROOT := ../..
DATA := data/slopodar.yaml
SOURCE_DATA := $(ROOT)/slopodar.yaml

.PHONY: build serve clean sync

sync:
	@cp $(SOURCE_DATA) $(DATA)
	@echo "synced slopodar.yaml"

build: sync
	$(HUGO)

serve: sync
	$(HUGO) server --bind 0.0.0.0 --port 1313

clean:
	rm -rf public resources
