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
    # Kill entire process tree (nodemon creates nested processes)
    # Get parent processes recursively
    get_process_tree() {
        local pid=$1
        local tree="$pid"
        local children=$(pgrep -P $pid 2>/dev/null)
        for child in $children; do
            tree="$tree $(get_process_tree $child)"
        done
        echo $tree
    }
    
    # Also find yarn/nodemon parent processes
    PARENT_PID=$(ps -o ppid= -p $FRONTEND_PID 2>/dev/null | tr -d ' ')
    if [ -n "$PARENT_PID" ] && [ "$PARENT_PID" != "1" ]; then
        # Get grandparent (likely nodemon)
        GRANDPARENT_PID=$(ps -o ppid= -p $PARENT_PID 2>/dev/null | tr -d ' ')
        if [ -n "$GRANDPARENT_PID" ] && [ "$GRANDPARENT_PID" != "1" ]; then
            # Kill from top of tree down
            ALL_PIDS=$(get_process_tree $GRANDPARENT_PID)
        else
            ALL_PIDS=$(get_process_tree $PARENT_PID)
        fi
    else
        ALL_PIDS=$(get_process_tree $FRONTEND_PID)
    fi
    
    # Kill all processes in tree
    for pid in $ALL_PIDS; do
        kill -TERM $pid 2>/dev/null
    done
    
    # Wait up to 5 seconds for graceful shutdown
    for i in {1..10}; do
        if ! lsof -i :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            break
        fi
        sleep 0.5
    done

    # Force kill any remaining processes
    if lsof -i :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        REMAINING=$(lsof -i :$FRONTEND_PORT -sTCP:LISTEN -t 2>/dev/null)
        for pid in $REMAINING $ALL_PIDS; do
            kill -9 $pid 2>/dev/null
        done
    fi

    # Clean up PID file
    [ -f "$PID_FILE" ] && rm "$PID_FILE"

    echo -e "${GREEN}✓ Stopped (PID: $FRONTEND_PID and process tree)${NC}"
    exit 0
fi

# Clean up stale PID file if process not running
if [ -f "$PID_FILE" ]; then
    rm "$PID_FILE"
fi

echo -e "${YELLOW}✗ Not running${NC}"
exit 0
