# Alpine Linux - Szybki Start

Ten przewodnik pomoże Ci szybko uruchomić serwer BDL MCP na Alpine Linux.

## 🚀 Najszybsza Instalacja (Rekomendowane)

```bash
# 1. Pobierz kod
git clone https://github.com/dvvbk/mcp-gus.git
cd mcp-gus

# 2. Uruchom instalator (wymaga root)
sudo sh setup-alpine.sh

# 3. Gotowe! 🎉
```

Serwer jest już uruchomiony na `http://0.0.0.0:8000`

## 📋 Co zostało zainstalowane?

- ✓ Wszystkie wymagane pakiety (python3, gcc, musl-dev, etc.)
- ✓ uv (menedżer pakietów Python)
- ✓ Użytkownik systemowy `mcp`
- ✓ Aplikacja w `/opt/mcp-gus`
- ✓ Usługa OpenRC `bdl-mcp-server`
- ✓ Automatyczne uruchamianie przy starcie systemu

## 🎮 Zarządzanie

```bash
# Start
rc-service bdl-mcp-server start

# Stop
rc-service bdl-mcp-server stop

# Restart
rc-service bdl-mcp-server restart

# Status
rc-service bdl-mcp-server status

# Logi na żywo
tail -f /var/log/bdl-mcp-server.log
```

## ⚙️ Konfiguracja

Edytuj `/etc/conf.d/bdl-mcp-server`:

```bash
sudo vi /etc/conf.d/bdl-mcp-server
```

Dostępne opcje:
```bash
BDL_HOST="0.0.0.0"        # Interfejs sieciowy
BDL_PORT="8000"           # Port serwera
BDL_DIR="/opt/mcp-gus"    # Katalog aplikacji
BDL_USER="mcp"            # Użytkownik
BDL_LOG="/var/log/bdl-mcp-server.log"  # Plik logów
```

Po zmianie restartuj:
```bash
rc-service bdl-mcp-server restart
```

## 🐋 Docker (Alternatywa)

Jeśli wolisz Docker:

```bash
# Build Alpine image (bardzo mały!)
docker build -f Dockerfile.alpine -t bdl-mcp-server:alpine .

# Run
docker run -d -p 8000:8000 --name bdl-mcp bdl-mcp-server:alpine

# Lub z docker-compose
docker-compose -f docker-compose.alpine.yml up -d
```

## 🔥 Firewall

Otwórz port 8000:

### iptables (ręcznie)
```bash
iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
rc-update add iptables
/etc/init.d/iptables save
```

### awall (frontend)
```bash
apk add --no-cache awall iptables

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

awall enable bdl-mcp
awall activate
```

## 🧪 Test

```bash
# Test SSE endpoint
curl -N http://localhost:8000/sse

# Test z innej maszyny
curl -N http://YOUR_SERVER_IP:8000/sse
```

## 📊 Monitoring

```bash
# Status usługi
rc-service bdl-mcp-server status

# Logi
tail -50 /var/log/bdl-mcp-server.log

# Zużycie zasobów
ps aux | grep server.py
```

## 🔧 Troubleshooting

### Problem: Usługa nie startuje

```bash
# Sprawdź logi
tail -100 /var/log/bdl-mcp-server.log

# Sprawdź konfigurację
cat /etc/conf.d/bdl-mcp-server

# Sprawdź czy katalog istnieje
ls -la /opt/mcp-gus

# Sprawdź uprawnienia
ls -la /opt/mcp-gus/server.py
```

### Problem: Port zajęty

```bash
# Sprawdź co używa portu 8000
netstat -tulpn | grep :8000

# Lub
lsof -i :8000

# Zabij proces
kill $(lsof -t -i :8000)
```

### Problem: Brak internetu po starcie

```bash
# Upewnij się że sieć jest dostępna przed startem
rc-update show default | grep net

# Sprawdź zależności usługi
rc-status
```

## 🗑️ Deinstalacja

```bash
# Zatrzymaj i usuń usługę
rc-service bdl-mcp-server stop
rc-update del bdl-mcp-server default
rm /etc/init.d/bdl-mcp-server
rm /etc/conf.d/bdl-mcp-server

# Usuń pliki
rm -rf /opt/mcp-gus
rm /var/log/bdl-mcp-server.log

# Usuń użytkownika (opcjonalnie)
deluser mcp
```

## 📚 Więcej Informacji

- **DEPLOYMENT.md** - pełna dokumentacja deploymentu
- **README.md** - dokumentacja projektu
- [Alpine Linux Wiki](https://wiki.alpinelinux.org/)
- [OpenRC Guide](https://wiki.gentoo.org/wiki/OpenRC)

## 💡 Wskazówki

1. **Bezpieczeństwo**: Zmień `BDL_HOST` na `127.0.0.1` jeśli nie potrzebujesz zewnętrznego dostępu
2. **Performance**: Alpine używa mało pamięci - świetny dla małych VPS (256MB RAM wystarczy)
3. **Updates**: Aktualizuj regularnie: `apk upgrade`
4. **Backup**: Regularnie backupuj `/opt/mcp-gus` i `/etc/conf.d/bdl-mcp-server`

## 🎯 Szybkie Komendy

```bash
# Pełny restart (reload konfiguracji)
rc-service bdl-mcp-server restart

# Status + ostatnie logi
rc-service bdl-mcp-server status && tail -20 /var/log/bdl-mcp-server.log

# Test dostępności
curl -I http://localhost:8000/sse

# Live monitoring
watch -n 5 'rc-service bdl-mcp-server status && ps aux | grep server.py'
```

---

Potrzebujesz pomocy? Otwórz issue na GitHub: https://github.com/dvvbk/mcp-gus/issues
