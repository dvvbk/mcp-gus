# Deployment Guide - BDL MCP Server

Ten dokument opisuje różne sposoby deploymentu serwera BDL MCP w trybie SSE.

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
