#!/bin/bash
# Uruchom serwer BDL MCP w trybie SSE
#
# Użycie:
#   ./run_sse.sh                    # uruchomi na localhost:8000
#   ./run_sse.sh 0.0.0.0 8080       # uruchomi na 0.0.0.0:8080

HOST=${1:-127.0.0.1}
PORT=${2:-8000}

echo "Uruchamianie BDL MCP Server w trybie SSE..."
echo "Host: $HOST"
echo "Port: $PORT"
echo ""
echo "Serwer będzie dostępny pod adresem:"
echo "  SSE endpoint: http://$HOST:$PORT/sse"
echo "  Messages endpoint: http://$HOST:$PORT/messages"
echo ""

python server.py --transport sse --host "$HOST" --port "$PORT"
