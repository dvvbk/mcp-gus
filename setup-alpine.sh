#!/bin/sh
# Setup script dla Alpine Linux
# Instaluje serwer BDL MCP jako usługę systemową

set -e

echo "========================================="
echo "BDL MCP Server - Instalacja dla Alpine"
echo "========================================="
echo ""

# Sprawdź czy jesteś rootem
if [ "$(id -u)" != "0" ]; then
   echo "Ten skrypt wymaga uprawnień root. Uruchom z sudo."
   exit 1
fi

# Konfiguracja
BDL_USER="${BDL_USER:-mcp}"
BDL_GROUP="${BDL_GROUP:-mcp}"
BDL_DIR="${BDL_DIR:-/opt/mcp-gus}"
BDL_HOST="${BDL_HOST:-0.0.0.0}"
BDL_PORT="${BDL_PORT:-8000}"

echo "Konfiguracja:"
echo "  Użytkownik: $BDL_USER"
echo "  Grupa: $BDL_GROUP"
echo "  Katalog: $BDL_DIR"
echo "  Host: $BDL_HOST"
echo "  Port: $BDL_PORT"
echo ""

# 1. Zainstaluj wymagane pakiety systemowe
echo "[1/7] Instalacja pakietów systemowych..."
apk add --no-cache \
    python3 \
    py3-pip \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    curl \
    wget

# 2. Zainstaluj uv jeśli nie ma
if ! command -v uv > /dev/null 2>&1; then
    echo "[2/7] Instalacja uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
else
    echo "[2/7] uv już zainstalowane"
fi

# 3. Stwórz użytkownika systemowego
echo "[3/7] Tworzenie użytkownika systemowego..."
if ! getent passwd "$BDL_USER" > /dev/null 2>&1; then
    addgroup -S "$BDL_GROUP" 2>/dev/null || true
    adduser -S -D -h "/home/$BDL_USER" -s /sbin/nologin -G "$BDL_GROUP" "$BDL_USER"
    echo "  Utworzono użytkownika: $BDL_USER"
else
    echo "  Użytkownik $BDL_USER już istnieje"
fi

# 4. Skopiuj pliki do docelowego katalogu
echo "[4/7] Kopiowanie plików..."
mkdir -p "$BDL_DIR"
cp -r server.py requirements.txt pyproject.toml "$BDL_DIR/"
chown -R "$BDL_USER:$BDL_GROUP" "$BDL_DIR"
chmod 755 "$BDL_DIR"
echo "  Pliki skopiowane do: $BDL_DIR"

# 5. Zainstaluj zależności Python
echo "[5/7] Instalacja zależności Python..."
cd "$BDL_DIR"
su - "$BDL_USER" -s /bin/sh -c "cd $BDL_DIR && uv venv && uv pip install -r requirements.txt" || {
    # Fallback na pip jeśli uv nie działa
    pip3 install -r requirements.txt
}

# 6. Zainstaluj usługę OpenRC
echo "[6/7] Instalacja usługi OpenRC..."
cp bdl-mcp-server.openrc /etc/init.d/bdl-mcp-server
chmod +x /etc/init.d/bdl-mcp-server

# Stwórz plik konfiguracyjny
cat > /etc/conf.d/bdl-mcp-server <<EOF
# Konfiguracja BDL MCP Server
BDL_USER="$BDL_USER"
BDL_GROUP="$BDL_GROUP"
BDL_DIR="$BDL_DIR"
BDL_HOST="$BDL_HOST"
BDL_PORT="$BDL_PORT"
BDL_LOG="/var/log/bdl-mcp-server.log"
BDL_PIDFILE="/var/run/bdl-mcp-server.pid"
EOF

# Stwórz katalog dla logów
mkdir -p /var/log
touch /var/log/bdl-mcp-server.log
chown "$BDL_USER:$BDL_GROUP" /var/log/bdl-mcp-server.log

echo "  Usługa zainstalowana"

# 7. Włącz i uruchom usługę
echo "[7/7] Uruchamianie usługi..."
rc-update add bdl-mcp-server default
rc-service bdl-mcp-server start

echo ""
echo "========================================="
echo "✓ Instalacja zakończona pomyślnie!"
echo "========================================="
echo ""
echo "Zarządzanie usługą:"
echo "  rc-service bdl-mcp-server start    - uruchom"
echo "  rc-service bdl-mcp-server stop     - zatrzymaj"
echo "  rc-service bdl-mcp-server restart  - restart"
echo "  rc-service bdl-mcp-server status   - status"
echo ""
echo "Logi:"
echo "  tail -f /var/log/bdl-mcp-server.log"
echo ""
echo "Serwer dostępny pod:"
echo "  http://$BDL_HOST:$BDL_PORT/sse"
echo "  http://$BDL_HOST:$BDL_PORT/messages"
echo ""
