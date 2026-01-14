#!/bin/bash
# Uruchom serwer BDL MCP w trybie SSE w tle używając uv
#
# Użycie:
#   ./run_sse_uv.sh                    # uruchomi na localhost:8000
#   ./run_sse_uv.sh 0.0.0.0 8080       # uruchomi na 0.0.0.0:8080

HOST=${1:-127.0.0.1}
PORT=${2:-8000}
PIDFILE="./mcp-server.pid"
LOGFILE="./mcp-server.log"

echo "Uruchamianie BDL MCP Server w trybie SSE (w tle)..."
echo "Host: $HOST"
echo "Port: $PORT"
echo "Logi: $LOGFILE"
echo ""

# Uruchom w tle z nohup
nohup uv run server.py --transport sse --host "$HOST" --port "$PORT" > "$LOGFILE" 2>&1 &

# Zapisz PID
echo $! > "$PIDFILE"

echo "Serwer uruchomiony z PID: $(cat $PIDFILE)"
echo ""
echo "Serwer dostępny pod adresem:"
echo "  SSE endpoint: http://$HOST:$PORT/sse"
echo "  Messages endpoint: http://$HOST:$PORT/messages"
echo ""
echo "Aby zatrzymać serwer:"
echo "  ./stop_sse.sh"
echo ""
echo "Aby zobaczyć logi:"
echo "  tail -f $LOGFILE"
