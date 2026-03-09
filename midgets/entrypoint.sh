#!/bin/bash
# Midget entrypoint — starts virtual display + window manager
set -e

# Start Xvfb (virtual framebuffer)
Xvfb :99 -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} -ac &
XVFB_PID=$!
sleep 1

# Verify Xvfb is running
if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "FATAL: Xvfb failed to start" >&2
    exit 1
fi

# Start fluxbox (minimal window manager — needed for window focus/raise)
fluxbox -display :99 &
sleep 1

echo "Midget display ready — ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} on :99"

# If arguments provided, run them; otherwise interactive shell
if [ $# -gt 0 ]; then
    exec "$@"
else
    exec /bin/bash
fi
