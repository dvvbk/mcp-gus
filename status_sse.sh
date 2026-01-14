#!/bin/bash
# Sprawdź status serwera BDL MCP

PIDFILE="./mcp-server.pid"
LOGFILE="./mcp-server.log"

if [ ! -f "$PIDFILE" ]; then
    echo "Status: STOPPED"
    echo "Plik PID nie istnieje. Serwer nie jest uruchomiony."
    exit 1
fi

PID=$(cat "$PIDFILE")

if ps -p $PID > /dev/null 2>&1; then
    echo "Status: RUNNING"
    echo "PID: $PID"
    echo ""

    # Pokaż informacje o procesie
    ps -p $PID -o pid,cmd,etime,%cpu,%mem

    echo ""
    echo "Ostatnie logi:"
    if [ -f "$LOGFILE" ]; then
        tail -10 "$LOGFILE"
    else
        echo "Plik logów nie istnieje."
    fi
else
    echo "Status: STOPPED"
    echo "Proces z PID $PID nie istnieje."
    rm -f "$PIDFILE"
    exit 1
fi
