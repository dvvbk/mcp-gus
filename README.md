# BDL MCP Server

Serwer MCP (Model Context Protocol) dla API BDL (Bank Danych Lokalnych) - publicznego API GUS (Główny Urząd Statystyczny) udostępniającego dane statystyczne o Polsce.

## 🚀 Deployment Options

Ten projekt oferuje **3 sposoby deploymentu**:

1. **🐍 Python (stdio/SSE)** - Lokalnie przez Claude Desktop lub jako serwer HTTP
   - Dla desktop MCP (stdio)
   - Dla hostowania SSE (Server-Sent Events)
   - Zobacz: główna dokumentacja poniżej

2. **☁️ Cloudflare Workers (TypeScript)** - Globalny edge deployment
   - 300+ lokalizacji na świecie
   - Darmowy tier: 100k requestów/dzień
   - Zero maintenance, auto-scaling
   - 👉 **[README-CLOUDFLARE-WORKERS.md](README-CLOUDFLARE-WORKERS.md)**

3. **🐋 Docker** - Konteneryzacja (Alpine/Debian)
   - Portable deployment
   - Alpine: 50-80 MB
   - Zobacz: [DEPLOYMENT.md](DEPLOYMENT.md)

## Opis

Ten serwer MCP umożliwia dostęp do danych statystycznych GUS poprzez protokół MCP. Dzięki temu modele językowe (LLM) mogą bezpośrednio pobierać i analizować dane statystyczne o Polsce.

## Funkcjonalności

Serwer udostępnia następujące narzędzia (tools):

### Poziomy agregacji (Aggregates)
- `get_aggregates` - Lista poziomów agregacji (kraj, województwo, powiat, gmina)
- `get_aggregate_by_id` - Szczegóły poziomu agregacji

### Atrybuty (Attributes)
- `get_attributes` - Lista atrybutów danych
- `get_attribute_by_id` - Szczegóły atrybutu

### Dane statystyczne (Data)
- `get_data_by_variable` - Dane dla jednej zmiennej
- `get_data_by_unit` - Dane dla jednostki terytorialnej
- `get_data_localities_by_unit` - Dane dla miejscowości

### Poziomy jednostek (Levels)
- `get_levels` - Lista poziomów jednostek terytorialnych
- `get_level_by_id` - Szczegóły poziomu

### Jednostki miary (Measures)
- `get_measures` - Lista jednostek miary
- `get_measure_by_id` - Szczegóły jednostki miary

### Tematy (Subjects)
- `get_subjects` - Lista tematów (kategorii danych)
- `get_subject_by_id` - Szczegóły tematu

### Jednostki terytorialne (Units)
- `get_units` - Lista jednostek terytorialnych
- `get_unit_by_id` - Szczegóły jednostki
- `search_units` - Wyszukiwanie jednostek po nazwie
- `get_localities` - Lista miejscowości statystycznych

### Zmienne (Variables)
- `get_variables` - Lista zmiennych (cech statystycznych)
- `get_variable_by_id` - Szczegóły zmiennej
- `search_variables` - Wyszukiwanie zmiennych

### Lata (Years)
- `get_years` - Lista lat z dostępnymi danymi
- `get_year_by_id` - Szczegóły roku

## Instalacja

### Wymagania
- Python 3.10+

### Instalacja zależności

```bash
pip install -r requirements.txt
```

Lub z wykorzystaniem pip:

```bash
pip install mcp httpx
```

## Uruchomienie

Serwer może być uruchomiony w dwóch trybach:
- **stdio** - Komunikacja przez standardowe wejście/wyjście (domyślnie, do użycia z Claude Desktop)
- **sse** - Serwer HTTP z obsługą Server-Sent Events (do hostowania)

### Tryb stdio (domyślny)

```bash
python server.py
# lub z jawnym określeniem trybu:
python server.py --transport stdio
```

### Tryb SSE (hostowanie HTTP)

**Uruchomienie na pierwszym planie:**

```bash
python server.py --transport sse --host 0.0.0.0 --port 8000
```

Lub użyj skryptu pomocniczego:

```bash
./run_sse.sh              # uruchomi na localhost:8000
./run_sse.sh 0.0.0.0 8080 # uruchomi na 0.0.0.0:8080
```

**Uruchomienie w tle z uv:**

```bash
# Uruchom w tle
./run_sse_uv.sh              # uruchomi na localhost:8000
./run_sse_uv.sh 0.0.0.0 8080 # uruchomi na 0.0.0.0:8080

# Sprawdź status
./status_sse.sh

# Zatrzymaj serwer
./stop_sse.sh

# Zobacz logi
tail -f mcp-server.log
```

**Uruchomienie jako usługa systemd:**

```bash
# Edytuj ścieżki w pliku bdl-mcp-server.service
sudo nano bdl-mcp-server.service

# Skopiuj do systemd
sudo cp bdl-mcp-server.service /etc/systemd/system/

# Włącz i uruchom
sudo systemctl daemon-reload
sudo systemctl enable bdl-mcp-server
sudo systemctl start bdl-mcp-server

# Sprawdź status
sudo systemctl status bdl-mcp-server

# Zobacz logi
sudo journalctl -u bdl-mcp-server -f
```

Parametry:
- `--transport` - Typ transportu: `stdio` lub `sse` (domyślnie: `stdio`)
- `--host` - Host do nasłuchiwania (domyślnie: `127.0.0.1`)
- `--port` - Port do nasłuchiwania (domyślnie: `8000`)

Po uruchomieniu w trybie SSE, serwer będzie dostępny pod adresem:
- **SSE endpoint**: `http://host:port/sse`
- **Messages endpoint**: `http://host:port/messages`

### Uruchomienie w Docker

Możesz również uruchomić serwer w kontenerze Docker:

```bash
# Standard (Debian-based)
docker build -t bdl-mcp-server .
docker run -p 8000:8000 bdl-mcp-server

# Alpine (6x mniejszy obraz)
docker build -f Dockerfile.alpine -t bdl-mcp-server:alpine .
docker run -p 8000:8000 bdl-mcp-server:alpine
```

Lub użyj docker-compose:

```bash
# Standard
docker-compose up -d

# Alpine
docker-compose -f docker-compose.alpine.yml up -d
```

Serwer będzie dostępny pod adresem `http://localhost:8000`

### Uruchomienie na Alpine Linux (OpenRC)

Dla Alpine Linux przygotowano dedykowany skrypt instalacyjny:

```bash
# Automatyczna instalacja jako usługa systemowa
sudo sh setup-alpine.sh

# Zarządzanie
rc-service bdl-mcp-server start
rc-service bdl-mcp-server stop
rc-service bdl-mcp-server status

# Logi
tail -f /var/log/bdl-mcp-server.log
```

Zobacz **DEPLOYMENT.md** dla szczegółów o Alpine Linux.

### Udostępnianie przez Internet (Cloudflare Tunnel)

Jeśli chcesz udostępnić serwer przez Internet, użyj Cloudflare Tunnel:

```bash
# 1. Uruchom serwer lokalnie
python server.py --transport sse --host 127.0.0.1 --port 8000

# 2. Uruchom Cloudflare Tunnel (quick tunnel)
cloudflared tunnel --url http://localhost:8000

# Otrzymasz URL: https://xxx.trycloudflare.com
```

**⚠️ Ważne dla SSE**: Cloudflare wymaga specjalnej konfiguracji dla długotrwałych połączeń.

Zobacz **CLOUDFLARE-TUNNEL.md** dla:
- Konfiguracji Named Tunnel
- Optymalizacji dla SSE
- Troubleshooting błędów połączeń
- Alternatywnych rozwiązań (ngrok, Tailscale)

### Konfiguracja w Claude Desktop

Dodaj do pliku konfiguracyjnego Claude Desktop (`claude_desktop_config.json`):

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bdl-api": {
      "command": "python",
      "args": ["/ścieżka/do/mcp-server/server.py"]
    }
  }
}
```

Lub z wykorzystaniem `uv`:

```json
{
  "mcpServers": {
    "bdl-api": {
      "command": "uv",
      "args": [
        "--directory",
        "/ścieżka/do/mcp-server",
        "run",
        "server.py"
      ]
    }
  }
}
```

### Łączenie z serwerem SSE

Jeśli uruchomiłeś serwer w trybie SSE, możesz połączyć się z nim używając klienta MCP z obsługą SSE:

```python
from mcp.client.sse import sse_client

async with sse_client("http://localhost:8000") as (read, write):
    # Komunikacja z serwerem
    pass
```

Lub z użyciem curl do testowania endpointów:

```bash
# Endpoint SSE (do otrzymywania eventów)
curl -N http://localhost:8000/sse

# Endpoint messages (do wysyłania wiadomości)
curl -X POST http://localhost:8000/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

## Przykłady użycia

### Pobranie listy województw

```
Użyj narzędzia get_units z parametrami:
- level: 2
- page_size: 20
```

### Wyszukanie danych o ludności Warszawy

```
1. Użyj search_units z name: "Warszawa"
2. Użyj search_variables z name: "ludność"
3. Użyj get_data_by_unit z odpowiednimi ID
```

### Pobranie danych demograficznych dla całego kraju

```
1. Użyj get_subjects aby znaleźć temat "Ludność"
2. Użyj get_variables z subject_id tematu
3. Użyj get_data_by_variable z var_id i unit_id: "000000000000" (Polska)
```

## Struktura odpowiedzi API

Odpowiedzi z API BDL zawierają typowo:
- `results` - lista wyników
- `totalRecords` - całkowita liczba rekordów
- `page` - numer strony
- `pageSize` - rozmiar strony
- `links` - linki do nawigacji (poprzednia/następna strona)

## Języki

API obsługuje dwa języki:
- `pl` - polski (domyślny)
- `en` - angielski

Parametr `lang` można przekazać do każdego narzędzia.

## Limity API

API BDL ma limity zapytań (rate limiting). Informacje o limitach są zwracane w nagłówkach odpowiedzi:
- `X-Rate-Limit-Limit` - limit zapytań
- `X-Rate-Limit-Remaining` - pozostałe zapytania
- `X-Rate-Limit-Reset` - czas resetu limitu

## Dokumentacja API BDL

Pełna dokumentacja API BDL dostępna jest pod adresem:
https://api.stat.gov.pl/Home/BdlApi

## Licencja

GNU GENERAL PUBLIC LICENSE

Stworzono na podstawie specyfikacji OpenAPI BDL API.
