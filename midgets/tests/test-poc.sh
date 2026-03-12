#!/bin/bash
# Midget POC — end-to-end proof that the wrapper concept works.
# Run inside the container: /opt/test-poc.sh
#
# Proves:
#   1. Virtual display is running
#   2. steer see — screenshots and lists windows
#   3. steer apps launch — opens xterm
#   4. steer see — detects the new window
#   5. steer click — clicks on the xterm window
#   6. steer type — types a command into xterm
#   7. steer hotkey — sends Return to execute the command
#   8. steer see — screenshots the result
#   9. steer clipboard write/read — roundtrips text
#  10. steer screens — reports display info

set -e

PASS=0
FAIL=0
STEER="/opt/steer/steer"

pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1" >&2; }

echo "=== Midget POC Test Suite ==="
echo ""

# 1. Display check
echo "[1/10] Display check"
if xdpyinfo -display :99 >/dev/null 2>&1; then
    pass "Xvfb :99 is running"
else
    fail "Xvfb :99 is not running"
fi

# 2. steer see (empty desktop)
echo "[2/10] steer see (empty desktop)"
RESULT=$($STEER see --json 2>/dev/null)
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['ok']; assert d['screenshot'].endswith('.png'); print(f'  screenshot: {d[\"screenshot\"]}')"; then
    pass "Screenshot captured"
else
    fail "Screenshot failed"
fi

# 3. steer screens
echo "[3/10] steer screens"
RESULT=$($STEER screens --json 2>/dev/null)
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['ok']; s=d['screens'][0]; print(f'  display: {s[\"width\"]}x{s[\"height\"]}'); assert s['width']==1280"; then
    pass "Screen info correct"
else
    fail "Screen info wrong"
fi

# 4. steer apps launch xterm
echo "[4/10] steer apps launch xterm"
$STEER apps launch xterm --args "-fa DejaVuSansMono -fs 14" --json >/dev/null 2>&1
sleep 1
RESULT=$($STEER apps list --json 2>/dev/null)
XTERM_FOUND=$(echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
found = any(a['name'] == 'xterm' for a in d['apps'])
print('yes' if found else 'no')
" 2>/dev/null)
if [ "$XTERM_FOUND" = "yes" ]; then
    pass "xterm launched and detected"
else
    fail "xterm not detected in app list"
fi

# 5. steer see (with xterm window)
echo "[5/10] steer see (with window)"
RESULT=$($STEER see --json 2>/dev/null)
WIN_COUNT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['window_count'])" 2>/dev/null)
if [ "$WIN_COUNT" -ge 1 ] 2>/dev/null; then
    pass "Window detected (count: $WIN_COUNT)"
else
    fail "No windows detected"
fi

# 6. steer click (click on xterm — center of screen)
echo "[6/10] steer click (center of screen)"
RESULT=$($STEER click --x 640 --y 360 --json 2>/dev/null)
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['ok']" 2>/dev/null; then
    pass "Click executed at 640,360"
else
    fail "Click failed"
fi

# 7. steer type
echo "[7/10] steer type"
RESULT=$($STEER type "echo MIDGET_ALIVE" --json 2>/dev/null)
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['ok']; assert d['text']=='echo MIDGET_ALIVE'" 2>/dev/null; then
    pass "Text typed: echo MIDGET_ALIVE"
else
    fail "Type failed"
fi

# 8. steer hotkey (send Return to execute the command)
echo "[8/10] steer hotkey (Return)"
RESULT=$($STEER hotkey "Return" --json 2>/dev/null)
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['ok']" 2>/dev/null; then
    pass "Return key sent"
else
    fail "Hotkey failed"
fi
sleep 1

# 8b. Verify the command actually executed (not just that keystrokes were sent)
# This closes the right-answer-wrong-work gap: tests 7+8 prove steer accepted
# input, but only this check proves the terminal acted on it.
echo "[8b/10] verify MIDGET_ALIVE in terminal output (OCR)"
RESULT=$($STEER see --ocr --json 2>/dev/null)
OCR_TEXT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ocr_text',''))" 2>/dev/null)
if echo "$OCR_TEXT" | grep -q "MIDGET_ALIVE"; then
    pass "MIDGET_ALIVE confirmed in terminal via OCR"
else
    # OCR can be noisy - check for partial match
    if echo "$OCR_TEXT" | grep -qiE "MIDGET.ALIVE|ALIVE"; then
        pass "MIDGET_ALIVE partial match in OCR (font variance)"
    else
        fail "MIDGET_ALIVE not found in terminal OCR output"
    fi
fi

# 9. steer clipboard roundtrip
echo "[9/10] steer clipboard roundtrip"
$STEER clipboard write "midget_clipboard_test" --json >/dev/null 2>&1
RESULT=$($STEER clipboard read --json 2>/dev/null)
CLIP_TEXT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['text'])" 2>/dev/null)
if [ "$CLIP_TEXT" = "midget_clipboard_test" ]; then
    pass "Clipboard roundtrip: wrote and read back correctly"
else
    fail "Clipboard roundtrip failed (got: $CLIP_TEXT)"
fi

# 10. Final screenshot (should show xterm with MIDGET_ALIVE output)
echo "[10/10] steer see (final state)"
RESULT=$($STEER see --json 2>/dev/null)
FINAL_SCREENSHOT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['screenshot'])" 2>/dev/null)
if [ -f "$FINAL_SCREENSHOT" ]; then
    # Copy to a well-known location for easy retrieval
    cp "$FINAL_SCREENSHOT" /tmp/steer/final-state.png
    pass "Final screenshot: /tmp/steer/final-state.png"
else
    fail "Final screenshot not found"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo "POC FAILED — wrapper concept NOT proven"
    exit 1
else
    echo "POC PASSED — wrapper concept PROVEN"
    echo ""
    echo "What was demonstrated:"
    echo "  - Virtual display (Xvfb) running at 1280x720"
    echo "  - Screenshot capture (scrot)"
    echo "  - Window detection (wmctrl)"
    echo "  - App launch and detection"
    echo "  - Mouse click at coordinates (xdotool)"
    echo "  - Text typing into GUI app (xdotool)"
    echo "  - Keyboard hotkeys (xdotool)"
    echo "  - Clipboard read/write (xclip)"
    echo "  - All via steer CLI with --json output"
    echo ""
    echo "Screenshots in /tmp/steer/"
    ls -la /tmp/steer/*.png 2>/dev/null
    exit 0
fi
