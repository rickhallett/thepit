.PHONY: gate build install test coverage clean

gate: build test
	go vet ./...

build:
	go build -o pitnet .

install:
	go install .

test:
	go test -v -count=1 -coverprofile=coverage.out ./...

coverage: test
	go tool cover -func=coverage.out

clean:
	rm -f pitnet coverage.out
