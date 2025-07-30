#!/bin/bash

# Metis Application Start Script
# This script starts all three components of the Metis application

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    echo "🚀 Metis Application Start Script"
    echo "=================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --separate-terminals, -s    Open each service in a separate terminal window"
    echo "  --background, -b            Run all services in background (default)"
    echo "  --help, -h                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Run in background mode"
    echo "  $0 --separate-terminals     # Open 3 separate terminal windows"
    echo "  $0 -s                       # Same as above (short form)"
}

# Function to detect terminal and open new windows
open_new_terminal() {
    local title="$1"
    local command="$2"
    local working_dir="$3"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use Terminal.app
        osascript -e "
            tell application \"Terminal\"
                do script \"cd '$working_dir' && echo 'Starting $title...' && $command\"
                set custom title of front window to \"$title\"
            end tell
        "
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - try different terminal emulators
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal --title="$title" --working-directory="$working_dir" -- bash -c "echo 'Starting $title...' && $command; exec bash"
        elif command -v konsole &> /dev/null; then
            konsole --new-tab --title "$title" --workdir "$working_dir" -e bash -c "echo 'Starting $title...' && $command; exec bash"
        elif command -v xterm &> /dev/null; then
            xterm -title "$title" -e "cd '$working_dir' && echo 'Starting $title...' && $command; exec bash" &
        else
            print_error "No supported terminal emulator found. Install gnome-terminal, konsole, or xterm."
            return 1
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows (Git Bash/Cygwin) - use cmd
        cmd.exe /c start "cmd.exe /k cd /d \"$working_dir\" && echo Starting $title... && $command"
    else
        print_error "Unsupported operating system: $OSTYPE"
        return 1
    fi
}

# Parse command line arguments
USE_SEPARATE_TERMINALS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --separate-terminals|-s)
            USE_SEPARATE_TERMINALS=true
            shift
            ;;
        --background|-b)
            USE_SEPARATE_TERMINALS=false
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

echo "🚀 Starting Metis Application..."
echo "================================"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    print_error "Please run this script from the metis-mono-repo root directory"
    exit 1
fi

# Get absolute path for terminal commands
METIS_ROOT=$(pwd)

if [ "$USE_SEPARATE_TERMINALS" = true ]; then
    print_status "Opening services in separate terminal windows..."
    
    # Open MCP Server in new terminal
    print_status "Opening MCP Server terminal..."
    open_new_terminal "Metis MCP Server" "npm run dev:http" "$METIS_ROOT/server"
    
    # Wait a moment
    sleep 2
    
    # Open Backend in new terminal
    print_status "Opening Backend terminal..."
    open_new_terminal "Metis Backend" "uvicorn app:app --host localhost --port 8000 --log-level debug" "$METIS_ROOT/client/backend"
    
    # Wait a moment
    sleep 2
    
    # Open Frontend in new terminal
    print_status "Opening Frontend terminal..."
    open_new_terminal "Metis Frontend" "npm start" "$METIS_ROOT/client/frontend"
    
    print_success "All services started in separate terminals!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend:    http://localhost:3000"
    echo "   Backend API: http://localhost:8000" 
    echo "   MCP Server:  http://localhost:9999"
    echo ""
    echo "✨ Check the separate terminal windows for service logs."
    echo "📝 Close the terminal windows to stop the services."
    
else
    print_status "Starting all services in background mode..."
    
    # Function to cleanup background processes
    cleanup() {
        print_warning "Shutting down services..."
        jobs -p | xargs -r kill
        exit 0
    }

    # Trap Ctrl+C
    trap cleanup SIGINT SIGTERM

    # Start MCP Server
    print_status "Starting MCP Server on http://localhost:9999..."
    cd server
    npm run dev:http &
    SERVER_PID=$!
    cd ..

    # Wait a moment for server to start
    sleep 3

    # Start Backend
    print_status "Starting Python Backend on http://localhost:8000..."
    cd client/backend
    uvicorn app:app --host localhost --port 8000 --log-level debug &
    BACKEND_PID=$!
    cd ../..

    # Wait a moment for backend to start
    sleep 3

    # Start Frontend
    print_status "Starting Frontend on http://localhost:3000..."
    cd client/frontend
    npm start &
    FRONTEND_PID=$!
    cd ../..

    print_success "All services started successfully!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend:    http://localhost:3000"
    echo "   Backend API: http://localhost:8000" 
    echo "   MCP Server:  http://localhost:9999"
    echo ""
    echo "📝 Logs will appear below. Press Ctrl+C to stop all services."
    echo "=================================================="

    # Wait for all background jobs to finish
    wait
fi 