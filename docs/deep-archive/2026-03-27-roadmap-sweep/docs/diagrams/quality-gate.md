# Quality Gate

`make gate` builds the container and runs 35 tests across 6 suites.
Every test runs inside the container. The gate is deterministic - no LLM
calls, no network dependencies, no API keys. If it passes on your machine,
it passes on any machine with Docker.

```
docker build
     |
     v
+------------------+
| test-poc.sh      |  11 tests  steer: see, click, type, hotkey,
|                  |            apps, clipboard, screens, OCR verify
+------------------+
     |
+------------------+
| test-drive.sh    |   9 tests  drive: session lifecycle, sentinel
|                  |            protocol, run/send/poll/logs
+------------------+
     |
+------------------+
| test-ocr.sh      |   3 tests  tesseract installed, ocr_text field,
|                  |            live screen text extraction
+------------------+
     |
+------------------+
| test-chromium.sh |   3 tests  Chrome installed, window detected,
|                  |            OCR reads page content
+------------------+
     |
+------------------+
| test-agent.sh    |   4 tests  node/claude present,
|                  |            observe->act->verify loop
+------------------+
     |
+------------------+
| test-jobs.sh     |   5 tests  jobrunner: status, shell_command,
|                  |            output capture, fail verdict, once mode
+------------------+
     |
     v
EXIT 0  = gate green
```

## What it proves

Each suite targets a different capability layer:

- **test-poc.sh** proves the GUI automation stack works. Xvfb is running,
  screenshots capture real pixels, clicks land at coordinates, text is typed
  into windows, clipboard roundtrips. The OCR verify step (8b) confirms typed
  text actually appeared on screen - not just that the `steer type` command
  returned ok.

- **test-drive.sh** proves the terminal automation stack works. tmux sessions
  are created and destroyed, commands execute with the sentinel protocol,
  exit codes are captured from markers, output is extracted between markers.

- **test-ocr.sh** proves Tesseract can read text from the framebuffer. This
  is the bridge between pixels and meaning - the agent can read what is on
  screen without a vision API call.

- **test-chromium.sh** proves Chrome runs inside the container and renders
  pages that OCR can read. The test navigates to a `data:text/plain` URL
  and verifies OCR returns the page content.

- **test-agent.sh** proves the agent framework skeleton works: observe (steer
  see), act (drive run), verify (drive run again to check result). No LLM -
  the decisions are scripted. The skeleton is what every LLM agent will use.

- **test-jobs.sh** proves the job protocol works: YAML in, shell execution
  via drive + sentinel, YAML out. Pass and fail verdicts. The `--once` mode
  that swarm workers use.

## What it does not prove

The gate cannot verify that an LLM agent produces correct output. That
requires `make crew` (live LLM calls) and human review. The gate proves the
infrastructure is sound. The crew proves the agents can use it.
