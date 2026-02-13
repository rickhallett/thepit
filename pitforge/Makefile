.PHONY: gate vet build install test coverage clean

vet:
	go vet ./...

gate: vet build test

build:
	go build -o pitforge .

install:
	go install .

test:
	go test -v -count=1 -coverprofile=coverage.out ./...

coverage: test
	go tool cover -func=coverage.out

clean:
	rm -f pitforge coverage.out
