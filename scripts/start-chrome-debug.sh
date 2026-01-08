#!/bin/bash
# Start Chrome with remote debugging for MCP connection

CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DEBUG_PORT=9222
USER_DATA_DIR="$HOME/.chrome-debug-profile"

# Check if Chrome is already running with debugging
if lsof -i :$DEBUG_PORT > /dev/null 2>&1; then
    echo "Chrome already running on port $DEBUG_PORT"
    echo "WebSocket URL:"
    curl -s http://localhost:$DEBUG_PORT/json/version | grep webSocketDebuggerUrl
    exit 0
fi

# Start Chrome with remote debugging
"$CHROME_PATH" \
    --remote-debugging-port=$DEBUG_PORT \
    --user-data-dir="$USER_DATA_DIR" \
    --no-first-run \
    --no-default-browser-check \
    http://localhost:3000 &

echo "Chrome started with remote debugging on port $DEBUG_PORT"
echo "Waiting for Chrome to initialize..."
sleep 3

# Get WebSocket URL
echo "WebSocket URL for MCP connection:"
curl -s http://localhost:$DEBUG_PORT/json/version | grep webSocketDebuggerUrl
