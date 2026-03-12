#!/bin/bash
# Midget entrypoint — starts virtual display + window manager
set -e

# Log directory for display services (keeps container stdout clean)
MIDGET_LOG=/tmp/midget-display.log

# Start Xvfb (virtual framebuffer)
Xvfb :99 -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} -ac >>"$MIDGET_LOG" 2>&1 &
XVFB_PID=$!

# Wait for Xvfb to accept connections (poll, not sleep)
DEADLINE=$((SECONDS + 10))
while ! xdpyinfo -display :99 >/dev/null 2>&1; do
    if [ $SECONDS -ge $DEADLINE ]; then
        echo "FATAL: Xvfb :99 not ready after 10s" >&2
        exit 1
    fi
    sleep 0.1
done

# Verify Xvfb process is still alive
if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "FATAL: Xvfb failed to start" >&2
    exit 1
fi

# Start fluxbox (minimal window manager — needed for window focus/raise)
fluxbox -display :99 >>"$MIDGET_LOG" 2>&1 &
FLUXBOX_PID=$!
sleep 0.5

# Verify fluxbox is still running
if ! kill -0 $FLUXBOX_PID 2>/dev/null; then
    echo "FATAL: fluxbox failed to start" >&2
    exit 1
fi

# Start VNC server if MIDGET_VNC is set (exposes display on port 5900)
if [ -n "$MIDGET_VNC" ]; then
    x11vnc -display :99 -forever -nopw -shared -rfbport 5900 >>"$MIDGET_LOG" 2>&1 &
    X11VNC_PID=$!
    sleep 0.3
    if kill -0 $X11VNC_PID 2>/dev/null; then
        echo "Midget VNC ready on port 5900"
    else
        echo "WARNING: x11vnc failed to start" >&2
    fi
fi

# Set window title to agent role if provided (visible in VNC toolbar)
if [ -n "$MIDGET_ROLE" ]; then
    xsetroot -name "midget: $MIDGET_ROLE" -display :99
fi

echo "Midget display ready — ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} on :99${MIDGET_ROLE:+ [$MIDGET_ROLE]}"

# If arguments provided, run them; otherwise interactive shell
if [ $# -gt 0 ]; then
    exec "$@"
else
    exec /bin/bash
fi
