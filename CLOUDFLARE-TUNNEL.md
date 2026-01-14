# Cloudflare Tunnel - Przewodnik dla BDL MCP Server

Ten przewodnik pomoże Ci udostępnić serwer BDL MCP przez Cloudflare Tunnel (cloudflared).

## 🚨 Problem z SSE przez Cloudflare

Server-Sent Events (SSE) to długotrwałe połączenia HTTP, które mogą być przerywane przez:
- Timeouty proxy
- Buforowanie chunked transfer encoding
- Brak keepalive

Cloudflare Tunnel wymaga specjalnej konfiguracji dla SSE.

## 🚀 Szybki Start (Quick Tunnel)

Najprostszy sposób - tymczasowy tunel bez konfiguracji:

```bash
# 1. Uruchom serwer MCP lokalnie
python server.py --transport sse --host 127.0.0.1 --port 8000

# 2. W drugim terminalu uruchom cloudflared
cloudflared tunnel --url http://localhost:8000

# 3. Otrzymasz adres URL (np. https://xxx.trycloudflare.com)
```

**Uwaga**: Quick tunnel ma ograniczenia dla SSE - lepiej użyć Named Tunnel (poniżej).

## 📝 Named Tunnel (Produkcyjne)

### 1. Instalacja cloudflared

**Linux:**
```bash
# Debian/Ubuntu
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Alpine
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

**macOS:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**Windows:**
```powershell
# Pobierz z https://github.com/cloudflare/cloudflared/releases
# Lub przez Chocolatey:
choco install cloudflared
```

### 2. Autentykacja

```bash
cloudflared tunnel login
```

To otworzy przeglądarkę - zaloguj się do Cloudflare i wybierz domenę.

### 3. Stwórz tunel

```bash
cloudflared tunnel create bdl-mcp-server
```

Zapisz:
- **Tunnel ID** (UUID)
- **Credentials file path** (np. `~/.cloudflared/<UUID>.json`)

### 4. Konfiguracja tunelu

Skopiuj i edytuj `cloudflared-config.yml`:

```bash
cp cloudflared-config.yml ~/.cloudflared/config.yml
nano ~/.cloudflared/config.yml
```

**Zmień:**
```yaml
tunnel: YOUR_TUNNEL_ID          # UUID z kroku 3
credentials-file: /path/to/YOUR_TUNNEL_CREDENTIALS.json
hostname: your-domain.com       # Twoja domena lub subdomena
```

### 5. Utwórz DNS record

```bash
cloudflared tunnel route dns bdl-mcp-server mcp.your-domain.com
```

### 6. Uruchom tunel

**Pierwszy terminal - serwer MCP:**
```bash
python server.py --transport sse --host 127.0.0.1 --port 8000
```

**Drugi terminal - cloudflared:**
```bash
cloudflared tunnel --config ~/.cloudflared/config.yml run bdl-mcp-server
```

### 7. Test

```bash
# Health check
curl https://mcp.your-domain.com/health

# SSE endpoint (powinien utrzymywać połączenie)
curl -N https://mcp.your-domain.com/sse
```

## ⚙️ Optymalizacja dla SSE

### Kluczowe ustawienia w `cloudflared-config.yml`:

```yaml
originRequest:
  # NIE buforuj chunked encoding
  disableChunkedEncoding: false

  # Długie timeouty
  connectTimeout: 30s
  keepAliveTimeout: 90s

  # HTTP/2 dla lepszej wydajności
  http2Origin: true

  # Więcej połączeń keepalive
  keepAliveConnections: 100
```

### Zwiększ replicas dla dostępności:

```yaml
replicas: 2  # lub więcej
```

## 🔧 Troubleshooting

### Problem: "stream canceled by remote with error code 0"

**Przyczyna**: Cloudflare przerywa połączenie SSE

**Rozwiązanie 1** - Użyj Named Tunnel z config.yml:
```yaml
originRequest:
  disableChunkedEncoding: false
  http2Origin: true
  keepAliveTimeout: 90s
```

**Rozwiązanie 2** - Zwiększ protocol timeout:
```yaml
protocol: quic  # QUIC ma lepsze wsparcie dla długich połączeń
```

**Rozwiązanie 3** - Użyj HTTP/2:
```yaml
originRequest:
  http2Origin: true
```

### Problem: Timeout po kilku sekundach

```yaml
originRequest:
  connectTimeout: 60s
  keepAliveTimeout: 120s
  tcpKeepAlive: 30s
```

### Problem: 502 Bad Gateway

**Sprawdź czy serwer działa:**
```bash
curl http://localhost:8000/health
```

**Sprawdź logi cloudflared:**
```bash
cloudflared tunnel --config ~/.cloudflared/config.yml --loglevel debug run
```

### Problem: Connection refused

**Upewnij się że bind jest na 127.0.0.1:**
```bash
python server.py --transport sse --host 127.0.0.1 --port 8000
```

**NIE używaj 0.0.0.0** gdy cloudflared jest lokalny!

## 🏃 Uruchomienie jako usługa

### systemd (Linux):

```bash
# Zainstaluj jako usługę
sudo cloudflared service install

# Edytuj config
sudo nano /etc/cloudflared/config.yml

# Start
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Status
sudo systemctl status cloudflared

# Logi
sudo journalctl -u cloudflared -f
```

### Windows Service:

```powershell
# Jako administrator
cloudflared service install
cloudflared service start
```

## 📊 Monitoring

### Metryki cloudflared:

Cloudflared eksponuje metryki Prometheus domyślnie na `127.0.0.1:2000/metrics`

```bash
curl http://127.0.0.1:2000/metrics
```

### Dashboard Cloudflare:

1. Zaloguj się do [dash.cloudflare.com](https://dash.cloudflare.com)
2. Przejdź do **Zero Trust** → **Access** → **Tunnels**
3. Zobacz metryki, logi i status tuneli

## 🔐 Bezpieczeństwo

### Ograniczenie dostępu (Cloudflare Access):

```yaml
ingress:
  - hostname: mcp.your-domain.com
    service: http://localhost:8000
    # Dodaj Access policy
    originRequest:
      # ... (jak wyżej)
```

Skonfiguruj Access Policy w dashboard:
1. Zero Trust → Access → Applications
2. Add application → Self-hosted
3. Dodaj reguły dostępu (email, IP, country, etc.)

### Certyfikat origin:

Dla extra bezpieczeństwa użyj origin certificate:
```bash
cloudflared tunnel --origincert /path/to/cert.pem run
```

## 📚 Zasoby

- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [SSE przez Cloudflare](https://developers.cloudflare.com/workers/examples/server-sent-events/)
- [cloudflared GitHub](https://github.com/cloudflare/cloudflared)

## 💡 Wskazówki

1. **Dla developmentu**: Użyj Quick Tunnel (`cloudflared tunnel --url`)
2. **Dla produkcji**: Użyj Named Tunnel z config.yml
3. **SSE wymaga**: HTTP/2 lub QUIC + odpowiednie timeouty
4. **Monitoring**: Włącz loglevel debug podczas testowania
5. **Replicas**: Użyj 2+ dla wysokiej dostępności

## 🆚 Alternatywy dla Cloudflare

Jeśli Cloudflare nie działa dobrze z SSE, rozważ:

### ngrok (łatwiejsze dla SSE):
```bash
ngrok http 8000
```

### localtunnel:
```bash
npx localtunnel --port 8000
```

### Tailscale:
```bash
tailscale serve http / http://localhost:8000
```

### Caddy reverse proxy (własny VPS):
```caddy
mcp.your-domain.com {
    reverse_proxy localhost:8000 {
        # SSE-friendly settings
        flush_interval -1
    }
}
```

---

**Potrzebujesz pomocy?** Otwórz issue: https://github.com/dvvbk/mcp-gus/issues
