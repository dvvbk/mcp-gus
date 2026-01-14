# Deployment Guide - BDL MCP Server

Ten dokument opisuje różne sposoby deploymentu serwera BDL MCP w trybie SSE.

## Wybór Systemu

- **Ubuntu/Debian/RHEL/CentOS** → systemd (sekcja 2)
- **Alpine Linux** → OpenRC (sekcja Alpine poniżej)
- **Dowolny system** → Docker (sekcja 3) lub nohup (sekcja 1)

## Szybki Start

### Uruchomienie w tle (uv)

```bash
# Uruchom serwer
./run_sse_uv.sh 0.0.0.0 8000

# Sprawdź czy działa
./status_sse.sh

# Zobacz logi w czasie rzeczywistym
tail -f mcp-server.log

# Zatrzymaj serwer
./stop_sse.sh
```

## Opcje Deploymentu

### 1. Nohup + uv (najprostsze)

**Zalety:**
- Nie wymaga uprawnień root
- Proste w użyciu
- Logi w pliku lokalnym

**Użycie:**
```bash
./run_sse_uv.sh 0.0.0.0 8000
```

**Zarządzanie:**
- Start: `./run_sse_uv.sh [host] [port]`
- Status: `./status_sse.sh`
- Stop: `./stop_sse.sh`
- Logi: `tail -f mcp-server.log`

---

### 2. systemd (produkcyjne)

**Zalety:**
- Automatyczne uruchamianie przy starcie systemu
- Automatyczny restart w przypadku awarii
- Centralne zarządzanie logami (journald)
- Lepsza izolacja i bezpieczeństwo

**Instalacja:**

1. Edytuj `bdl-mcp-server.service` i zaktualizuj:
   - `User` - nazwa użytkownika
   - `Group` - grupa użytkownika
   - `WorkingDirectory` - pełna ścieżka do projektu
   - `Environment="PATH=..."` - ścieżka do uv

2. Zainstaluj usługę:
```bash
sudo cp bdl-mcp-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bdl-mcp-server
sudo systemctl start bdl-mcp-server
```

**Zarządzanie:**
```bash
# Status
sudo systemctl status bdl-mcp-server

# Start
sudo systemctl start bdl-mcp-server

# Stop
sudo systemctl stop bdl-mcp-server

# Restart
sudo systemctl restart bdl-mcp-server

# Logi (ostatnie 50 linii)
sudo journalctl -u bdl-mcp-server -n 50

# Logi na żywo
sudo journalctl -u bdl-mcp-server -f
```

---

### 3. Docker (portable)

**Zalety:**
- Izolowane środowisko
- Łatwe przenoszenie między serwerami
- Nie wymaga instalacji Python na hoście

**Uruchomienie:**

```bash
# Build i run
docker-compose up -d

# Logi
docker-compose logs -f

# Status
docker-compose ps

# Stop
docker-compose down
```

**Lub bezpośrednio przez docker:**
```bash
docker build -t bdl-mcp-server .
docker run -d -p 8000:8000 --name bdl-mcp bdl-mcp-server
```

---

### 4. Screen/tmux (developerskie)

**Zalety:**
- Łatwe podłączanie się do sesji
- Przydatne przy debugowaniu

**Użycie przez screen:**
```bash
# Utwórz sesję
screen -S bdl-mcp

# W sesji uruchom serwer
uv run server.py --transport sse --host 0.0.0.0 --port 8000

# Odłącz się: Ctrl+A, D

# Wróć do sesji
screen -r bdl-mcp

# Lista sesji
screen -ls
```

**Użycie przez tmux:**
```bash
# Utwórz sesję
tmux new -s bdl-mcp

# W sesji uruchom serwer
uv run server.py --transport sse --host 0.0.0.0 --port 8000

# Odłącz się: Ctrl+B, D

# Wróć do sesji
tmux attach -t bdl-mcp

# Lista sesji
tmux ls
```

---

## Konfiguracja Portu i Hosta

### Localhost (tylko lokalne połączenia)
```bash
--host 127.0.0.1 --port 8000
```

### Wszystkie interfejsy (dostęp z sieci)
```bash
--host 0.0.0.0 --port 8000
```

### Określony interfejs
```bash
--host 192.168.1.100 --port 8000
```

---

## Bezpieczeństwo

### Firewall

Jeśli udostępniasz serwer w sieci, skonfiguruj firewall:

```bash
# ufw (Ubuntu/Debian)
sudo ufw allow 8000/tcp

# firewalld (RHEL/CentOS)
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

### Reverse Proxy (nginx)

Zalecane dla produkcji - użyj nginx jako reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Ważne dla SSE
        proxy_buffering off;
        proxy_cache off;
    }
}
```

---

## Monitorowanie

### Sprawdzenie czy serwer odpowiada

```bash
# Test SSE endpoint
curl -N http://localhost:8000/sse

# Test healthcheck (jeśli dodany)
curl http://localhost:8000/health
```

### Monitoring zasobów

```bash
# CPU i pamięć przez top
top -p $(cat mcp-server.pid)

# Szczegółowe info
ps aux | grep server.py

# Z systemd
systemctl status bdl-mcp-server
```

---

## Rozwiązywanie Problemów

### Serwer nie startuje

1. Sprawdź logi:
   ```bash
   cat mcp-server.log
   # lub
   sudo journalctl -u bdl-mcp-server -n 100
   ```

2. Sprawdź czy port jest zajęty:
   ```bash
   sudo netstat -tulpn | grep :8000
   # lub
   sudo lsof -i :8000
   ```

3. Sprawdź czy zależności są zainstalowane:
   ```bash
   uv pip list | grep -E "mcp|starlette|uvicorn"
   ```

### Serwer się zawiesza

```bash
# Sprawdź logi systemowe
dmesg | tail

# Sprawdź pamięć
free -h

# Restartuj
./stop_sse.sh && ./run_sse_uv.sh
```

### Port zajęty

```bash
# Znajdź proces używający portu
sudo lsof -i :8000

# Zabij proces
sudo kill $(sudo lsof -t -i :8000)
```

---

## Performance Tuning

### Uvicorn Workers

Dla lepszej wydajności możesz użyć wielu workerów:

```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

Uwaga: Musisz dostosować `server.py` żeby eksportować app object.

### Limits systemd

Dodaj do service file:

```ini
[Service]
LimitNOFILE=65536
LimitNPROC=4096
```

---

## Backup i Recovery

### Backup konfiguracji

```bash
tar -czf bdl-mcp-backup.tar.gz \
    server.py \
    pyproject.toml \
    requirements.txt \
    *.sh \
    *.service
```

### Recovery

```bash
tar -xzf bdl-mcp-backup.tar.gz
chmod +x *.sh
./run_sse_uv.sh
```

---

## Alpine Linux (OpenRC)

Alpine Linux używa OpenRC jako system init zamiast systemd.

### Automatyczna Instalacja

**Najszybszy sposób - użyj skryptu instalacyjnego:**

```bash
# Pobierz wszystkie potrzebne pliki
# (zakładając że jesteś w katalogu projektu)

# Uruchom instalację (wymaga root)
sudo sh setup-alpine.sh

# Serwer zostanie automatycznie zainstalowany i uruchomiony!
```

Skrypt wykonuje:
1. ✓ Instaluje wymagane pakiety (python3, gcc, musl-dev, itp.)
2. ✓ Instaluje uv (jeśli nie ma)
3. ✓ Tworzy użytkownika systemowego `mcp`
4. ✓ Kopiuje pliki do `/opt/mcp-gus`
5. ✓ Instaluje zależności Python
6. ✓ Konfiguruje usługę OpenRC
7. ✓ Uruchamia serwer

### Ręczna Instalacja (OpenRC)

Jeśli wolisz ręczną instalację:

**1. Zainstaluj zależności systemowe:**

```bash
# Podstawowe pakiety
apk add --no-cache \
    python3 \
    py3-pip \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev

# Zainstaluj uv
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**2. Przygotuj użytkownika i katalog:**

```bash
# Stwórz użytkownika systemowego
addgroup -S mcp
adduser -S -D -h /home/mcp -s /sbin/nologin -G mcp mcp

# Stwórz katalog aplikacji
mkdir -p /opt/mcp-gus
cp server.py requirements.txt pyproject.toml /opt/mcp-gus/
chown -R mcp:mcp /opt/mcp-gus

# Zainstaluj zależności
cd /opt/mcp-gus
uv venv
uv pip install -r requirements.txt
```

**3. Zainstaluj usługę OpenRC:**

```bash
# Skopiuj plik service
cp bdl-mcp-server.openrc /etc/init.d/bdl-mcp-server
chmod +x /etc/init.d/bdl-mcp-server

# Stwórz plik konfiguracyjny (opcjonalnie)
cat > /etc/conf.d/bdl-mcp-server <<EOF
BDL_USER="mcp"
BDL_GROUP="mcp"
BDL_DIR="/opt/mcp-gus"
BDL_HOST="0.0.0.0"
BDL_PORT="8000"
BDL_LOG="/var/log/bdl-mcp-server.log"
EOF

# Dodaj do autostartu
rc-update add bdl-mcp-server default

# Uruchom
rc-service bdl-mcp-server start
```

### Zarządzanie usługą (OpenRC)

```bash
# Start
rc-service bdl-mcp-server start

# Stop
rc-service bdl-mcp-server stop

# Restart
rc-service bdl-mcp-server restart

# Status
rc-service bdl-mcp-server status

# Logi
tail -f /var/log/bdl-mcp-server.log

# Usuń z autostartu
rc-update del bdl-mcp-server default

# Dodaj do autostartu
rc-update add bdl-mcp-server default
```

### Docker na Alpine

Alpine Linux jest również świetnym wyborem dla kontenerów Docker (mniejszy rozmiar):

```bash
# Użyj Alpine-specific Dockerfile
docker build -f Dockerfile.alpine -t bdl-mcp-server:alpine .

# Uruchom
docker run -d -p 8000:8000 --name bdl-mcp bdl-mcp-server:alpine

# Lub przez docker-compose
docker-compose -f docker-compose.alpine.yml up -d
```

Porównanie rozmiarów obrazów:
- **Debian/Ubuntu base**: ~300-500 MB
- **Alpine base**: ~50-80 MB (6x mniejszy!)

### Konfiguracja OpenRC

Edytuj `/etc/conf.d/bdl-mcp-server` aby zmienić ustawienia:

```bash
# Zmień port
BDL_PORT="9000"

# Zmień host (tylko localhost)
BDL_HOST="127.0.0.1"

# Inna ścieżka do logów
BDL_LOG="/var/log/mcp/server.log"

# Restart aby zastosować zmiany
rc-service bdl-mcp-server restart
```

### Alpine-specific Troubleshooting

**Problem: "musl libc" incompatibility**

Niektóre pakiety Python mogą wymagać kompilacji na Alpine:

```bash
apk add --no-cache gcc musl-dev libffi-dev openssl-dev
```

**Problem: brak "bash"**

Alpine używa `sh` (BusyBox) zamiast `bash`. Skrypty `.sh` w projekcie są kompatybilne z POSIX sh.

Jeśli potrzebujesz bash:
```bash
apk add --no-cache bash
```

**Problem: "rc-service: command not found"**

Upewnij się że używasz Alpine z OpenRC (standardowa wersja):
```bash
apk add --no-cache openrc
```

### Firewall na Alpine (awall)

Alpine używa `awall` jako frontend do iptables:

```bash
# Zainstaluj awall
apk add --no-cache awall iptables ip6tables

# Dodaj regułę dla portu 8000
cat > /etc/awall/optional/bdl-mcp.json <<EOF
{
  "description": "BDL MCP Server",
  "filter": [
    {
      "in": "eth0",
      "service": { "proto": "tcp", "port": 8000 },
      "action": "accept"
    }
  ]
}
EOF

# Włącz regułę
awall enable bdl-mcp
awall activate

# Zapisz na stałe
rc-update add iptables
/etc/init.d/iptables save
```

### Performance na Alpine

Alpine jest bardzo lekki - świetnie nadaje się do małych VPS/kontenerów:

**Rekomendowane minimum:**
- CPU: 1 core (shared)
- RAM: 256 MB
- Disk: 100 MB

**Dla produkcji:**
- CPU: 2+ cores
- RAM: 512 MB - 1 GB
- Disk: 500 MB

---
