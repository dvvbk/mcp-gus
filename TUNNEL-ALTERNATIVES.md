# Alternatywy dla Cloudflare Tunnel - SSE-Friendly

Cloudflare Quick Tunnel ma problemy z długotrwałymi połączeniami SSE.
Oto lepsze alternatywy:

---

## 🚀 1. ngrok (NAJLEPSZE dla SSE)

**Zalety:**
- ✅ Świetne wsparcie SSE out-of-the-box
- ✅ Prosty w użyciu
- ✅ Darmowy plan wystarczający
- ✅ HTTPS automatycznie
- ✅ Web UI do inspekcji requestów

**Instalacja:**
```bash
# Linux/macOS
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok

# macOS (Homebrew)
brew install ngrok

# Windows (Chocolatey)
choco install ngrok

# Lub pobierz z: https://ngrok.com/download
```

**Użycie:**
```bash
# 1. Uruchom serwer lokalnie
python server.py --transport sse --host 127.0.0.1 --port 8000

# 2. W drugim terminalu:
ngrok http 8000

# 3. Otrzymasz URL:
# https://abc123.ngrok.io
```

**Autentykacja (opcjonalnie):**
```bash
# Zarejestruj się na ngrok.com i pobierz token
ngrok config add-authtoken YOUR_TOKEN

# Teraz możesz używać dłużej i mieć więcej funkcji
```

**Dla produkcji:**
```bash
# Stały subdomain (wymaga płatnego planu)
ngrok http 8000 --subdomain=mcp-bdl-api
```

---

## 🔥 2. localtunnel (NAJPROSTSZY)

**Zalety:**
- ✅ Nie wymaga rejestracji
- ✅ Działa przez npx (bez instalacji)
- ✅ Open source

**Użycie:**
```bash
# 1. Uruchom serwer
python server.py --transport sse --host 127.0.0.1 --port 8000

# 2. Uruchom localtunnel (przez npx - bez instalacji)
npx localtunnel --port 8000

# Lub z własną subdomeną:
npx localtunnel --port 8000 --subdomain mcp-bdl

# Otrzymasz URL:
# https://mcp-bdl.loca.lt
```

**Instalacja globalna (opcjonalnie):**
```bash
npm install -g localtunnel
lt --port 8000
```

---

## 🌐 3. Tailscale (NAJLEPSZE dla stałego dostępu)

**Zalety:**
- ✅ Prywatna sieć VPN (WireGuard)
- ✅ Nie przechodzi przez publiczny proxy
- ✅ Szybkie i bezpieczne
- ✅ Dostęp tylko dla zaufanych urządzeń
- ✅ Działa na wszystkich platformach

**Instalacja:**
```bash
# Ubuntu/Debian
curl -fsSL https://tailscale.com/install.sh | sh

# macOS
brew install tailscale

# Windows
# Pobierz z: https://tailscale.com/download
```

**Użycie:**
```bash
# 1. Zaloguj się (na obu maszynach - serwer i klient)
sudo tailscale up

# 2. Uruchom serwer
python server.py --transport sse --host 0.0.0.0 --port 8000

# 3. Sprawdź IP Tailscale
tailscale ip -4

# 4. Z innej maszyny w sieci Tailscale:
curl http://100.x.y.z:8000/health

# Lub użyj Tailscale Serve (publiczny HTTPS):
tailscale serve https / http://127.0.0.1:8000
```

---

## ⚡ 4. bore (Nowoczesny i szybki)

**Zalety:**
- ✅ Napisany w Rust (bardzo szybki)
- ✅ Minimalistyczny
- ✅ Open source

**Instalacja:**
```bash
# Cargo (Rust)
cargo install bore-cli

# Lub pobierz binary z GitHub
wget https://github.com/ekzhang/bore/releases/latest/download/bore-linux-x86_64
chmod +x bore-linux-x86_64
sudo mv bore-linux-x86_64 /usr/local/bin/bore
```

**Użycie:**
```bash
# 1. Uruchom serwer
python server.py --transport sse --host 127.0.0.1 --port 8000

# 2. Uruchom bore
bore local 8000 --to bore.pub

# Otrzymasz URL:
# bore.pub:XXXXX
```

---

## 🔌 5. serveo.net (Przez SSH)

**Zalety:**
- ✅ Używa tylko SSH (bez instalacji!)
- ✅ Działa wszędzie gdzie jest SSH

**Użycie:**
```bash
# 1. Uruchom serwer
python server.py --transport sse --host 127.0.0.1 --port 8000

# 2. Tuneluj przez SSH
ssh -R 80:localhost:8000 serveo.net

# Otrzymasz URL:
# https://xyz.serveo.net
```

**Z własną subdomeną:**
```bash
ssh -R mcp:80:localhost:8000 serveo.net
# https://mcp.serveo.net
```

---

## 📊 Porównanie

| Narzędzie      | SSE Support | Łatwość | Rejestracja | Darmowe | HTTPS |
|----------------|-------------|---------|-------------|---------|-------|
| **ngrok**      | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐ | Opcjonalna  | ✅      | ✅    |
| **localtunnel**| ⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐ | Nie         | ✅      | ✅    |
| **Tailscale**  | ⭐⭐⭐⭐⭐    | ⭐⭐⭐    | Tak         | ✅      | ✅    |
| **bore**       | ⭐⭐⭐⭐     | ⭐⭐⭐⭐  | Nie         | ✅      | ❌    |
| **serveo**     | ⭐⭐⭐      | ⭐⭐⭐⭐⭐ | Nie         | ✅      | ✅    |
| Cloudflare     | ⭐⭐        | ⭐⭐⭐    | Nie (quick) | ✅      | ✅    |

---

## 🎯 Rekomendacje

### Dla szybkiego testu:
```bash
npx localtunnel --port 8000
```

### Dla developmentu:
```bash
ngrok http 8000
```

### Dla produkcji (prywatny):
```bash
# Tailscale
tailscale serve https / http://127.0.0.1:8000
```

### Dla produkcji (publiczny):
- VPS + nginx reverse proxy
- Własna domena + Caddy
- Railway.app / Render.com / Fly.io

---

## 🧪 Test SSE

Po uruchomieniu tunelu, przetestuj SSE:

```bash
# Test health
curl https://twoj-tunel-url/health

# Test SSE (powinien streamować eventy)
curl -N https://twoj-tunel-url/sse-test

# Powinno pokazać 10 eventów co sekundę
```

---

## 💡 Wskazówki

1. **ngrok** - najlepszy wybór dla większości przypadków
2. **localtunnel** - jeśli nie chcesz rejestracji
3. **Tailscale** - jeśli potrzebujesz bezpiecznego dostępu tylko dla siebie
4. **Cloudflare Named Tunnel** - działa, ale wymaga konfiguracji (zobacz CLOUDFLARE-TUNNEL.md)

**Unikaj:**
- ❌ Cloudflare Quick Tunnel dla SSE (zbyt krótkie timeouty)
- ❌ bore.pub bez HTTPS (brak szyfrowania)
