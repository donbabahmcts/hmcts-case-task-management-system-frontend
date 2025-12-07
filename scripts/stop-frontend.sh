#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the project root directory (parent of scripts/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

FRONTEND_PORT=3100
LOG_DIR="${HMCTS_LOG_DIR:-$PROJECT_ROOT/logs}"
PID_FILE="$LOG_DIR/frontend.pid"

echo "======================================"
echo "HMCTS Frontend Stopper"
echo "======================================"
echo ""

echo -n "Stopping frontend... "

# Find process by port (most reliable method)
FRONTEND_PID=$(lsof -i :$FRONTEND_PORT -sTCP:LISTEN -t 2>/dev/null)

if [ -n "$FRONTEND_PID" ]; then
    # Kill child processes first (nodemon spawns children)
    pkill -P $FRONTEND_PID 2>/dev/null
    # Kill main process
    kill -TERM $FRONTEND_PID 2>/dev/null

    # Wait up to 5 seconds for graceful shutdown
    for i in {1..10}; do
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            break
        fi
        sleep 0.5
    done

    # Force kill if still running
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill -9 $FRONTEND_PID 2>/dev/null
    fi

    # Clean up PID file
    [ -f "$PID_FILE" ] && rm "$PID_FILE"

    echo -e "${GREEN}✓ Stopped (PID: $FRONTEND_PID)${NC}"
    exit 0
fi

# Clean up stale PID file if process not running
if [ -f "$PID_FILE" ]; then
    rm "$PID_FILE"
fi

echo -e "${YELLOW}✗ Not running${NC}"
exit 0
