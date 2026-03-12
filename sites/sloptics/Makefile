# sloptics.dev — Hugo build wrapper
# Syncs slopodar data from monorepo root, generates content stubs, builds site.

ROOT := $(shell git rev-parse --show-toplevel)
SLOPODAR_SRC := $(ROOT)/docs/internal/slopodar.yaml

.PHONY: sync stubs build serve clean

sync: stubs
	@cp $(SLOPODAR_SRC) data/slopodar.yaml
	@echo "sloptics: data synced"

stubs:
	@mkdir -p content/slopodar
	@awk '/^  - id:/ { id=$$3 } /^    name:/ { name=$$0; sub(/^    name: /, "", name); \
	  gsub(/"/, "", name); \
	  file="content/slopodar/" id ".md"; \
	  if (system("test -f " file) != 0) { \
	    print "+++" > file; \
	    print "title = \"" name "\"" >> file; \
	    print "id = \"" id "\"" >> file; \
	    print "+++" >> file; \
	    close(file); \
	    printf "  stub: %s\n", id \
	  } \
	}' $(SLOPODAR_SRC)

build: sync
	hugo

serve: sync
	hugo server --bind 0.0.0.0 --port 1314

clean:
	rm -rf public resources
