#!/bin/bash
# Zatrzymaj serwer BDL MCP działający w tle

PIDFILE="./mcp-server.pid"

if [ ! -f "$PIDFILE" ]; then
    echo "Nie znaleziono pliku PID. Serwer może nie być uruchomiony."
    exit 1
fi

PID=$(cat "$PIDFILE")

if ps -p $PID > /dev/null 2>&1; then
    echo "Zatrzymywanie serwera (PID: $PID)..."
    kill $PID

    # Poczekaj na zakończenie procesu
    sleep 2

    if ps -p $PID > /dev/null 2>&1; then
        echo "Serwer nie odpowiada, wymuszam zatrzymanie..."
        kill -9 $PID
    fi

    rm -f "$PIDFILE"
    echo "Serwer zatrzymany."
else
    echo "Proces z PID $PID nie istnieje."
    rm -f "$PIDFILE"
fi
