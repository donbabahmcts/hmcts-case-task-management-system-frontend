#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the project root directory (parent of scripts/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Frontend configuration
FRONTEND_PORT=3100

# Use project-local logs directory, or override with environment variable
LOG_DIR="${HMCTS_LOG_DIR:-$PROJECT_ROOT/logs}"

PID_FILE="$LOG_DIR/frontend.pid"
LOG_FILE="$LOG_DIR/frontend.log"

echo "======================================"
echo "HMCTS Frontend Starter"
echo "======================================"
echo ""

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Clean up stale PID file
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ! kill -0 $OLD_PID 2>/dev/null; then
        echo -e "${YELLOW}Removing stale PID file${NC}"
        rm "$PID_FILE"
    fi
fi

# Check if frontend is already running
echo -n "Checking frontend (port $FRONTEND_PORT)... "
if lsof -i :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    RUNNING_PID=$(lsof -i :$FRONTEND_PORT -sTCP:LISTEN -t)
    echo -e "${YELLOW}✓ Already running (PID: $RUNNING_PID)${NC}"
    echo "  Use './scripts/stop-frontend.sh' to stop it first"
    echo "  Or access it at: https://localhost:$FRONTEND_PORT"
    exit 1
fi
echo -e "${YELLOW}✗ Not running${NC}"

# Clean up any stale yarn/nodemon processes (not on port but still running)
pkill -f "yarn.*start:dev" 2>/dev/null
pkill -f "nodemon.*server.ts" 2>/dev/null
sleep 1

# Start frontend
echo -e "\n${YELLOW}Starting frontend...${NC}"
cd "$PROJECT_ROOT"

# Install dependencies from package.json
echo "Installing dependencies..."
yarn install --silent

# Start frontend in background
nohup yarn start:dev > "$LOG_FILE" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PID_FILE"

echo -e "${GREEN}✓ Frontend starting (PID: $FRONTEND_PID)${NC}"
echo "  Log: $LOG_FILE"
echo "  Waiting for frontend to initialize..."

# Wait and check if frontend started successfully
for i in {1..30}; do
    if lsof -i :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is now running on port $FRONTEND_PORT${NC}"
        echo ""
        echo "Access URL:"
        echo "  Frontend: https://localhost:$FRONTEND_PORT"
        exit 0
    fi

    # Check if process is still alive
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}✗ Frontend process died during startup${NC}"
        echo "  Last 20 lines of log:"
        tail -20 "$LOG_FILE" 2>/dev/null || echo "  (log file not found)"
        exit 1
    fi

    sleep 0.5
done

echo -e "${RED}✗ Frontend failed to start within 15 seconds${NC}"
echo "  Process is running but not listening on port $FRONTEND_PORT"
echo "  Last 20 lines of log:"
tail -20 "$LOG_FILE" 2>/dev/null
exit 1
