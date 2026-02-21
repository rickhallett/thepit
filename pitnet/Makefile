.PHONY: gate vet build install test coverage clean dist

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS := -s -w -X main.version=$(VERSION)
DIST := dist

vet:
	go vet ./...

gate: vet build test

build:
	go build -ldflags "$(LDFLAGS)" -o pitnet .

install:
	go install -ldflags "$(LDFLAGS)" .

test:
	go test -v -count=1 -coverprofile=coverage.out ./...

coverage: test
	go tool cover -func=coverage.out

clean:
	rm -f pitnet coverage.out
	rm -rf $(DIST)

# Cross-compile for community distribution.
# Produces tarballs (unix) and zips (windows) in dist/.
dist: clean
	@mkdir -p $(DIST)
	@echo "Building pitnet $(VERSION) for all platforms..."
	GOOS=linux   GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(DIST)/pitnet-linux-amd64/pitnet .
	GOOS=linux   GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o $(DIST)/pitnet-linux-arm64/pitnet .
	GOOS=darwin  GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(DIST)/pitnet-darwin-amd64/pitnet .
	GOOS=darwin  GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o $(DIST)/pitnet-darwin-arm64/pitnet .
	GOOS=windows GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(DIST)/pitnet-windows-amd64/pitnet.exe .
	@# Bundle verification script with each archive (fail fast if missing)
	@test -f ../scripts/verify-attestation.sh || { echo "error: ../scripts/verify-attestation.sh not found"; exit 1; }
	@for dir in $(DIST)/pitnet-*/; do \
		cp ../scripts/verify-attestation.sh "$$dir"; \
	done
	@# Create archives
	cd $(DIST) && tar czf pitnet-linux-amd64.tar.gz  pitnet-linux-amd64/
	cd $(DIST) && tar czf pitnet-linux-arm64.tar.gz  pitnet-linux-arm64/
	cd $(DIST) && tar czf pitnet-darwin-amd64.tar.gz pitnet-darwin-amd64/
	cd $(DIST) && tar czf pitnet-darwin-arm64.tar.gz pitnet-darwin-arm64/
	cd $(DIST) && zip -rq  pitnet-windows-amd64.zip  pitnet-windows-amd64/
	@echo "Done. Archives in $(DIST)/"
	@ls -lh $(DIST)/*.tar.gz $(DIST)/*.zip
