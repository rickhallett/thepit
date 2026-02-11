.PHONY: gate build install test clean

gate: build test
	go vet ./...

build:
	go build -o pitlab .

install:
	go install .

test:
	go test -v -count=1 -coverprofile=coverage.out ./...

coverage: test
	go tool cover -func=coverage.out

clean:
	rm -f pitlab coverage.out
