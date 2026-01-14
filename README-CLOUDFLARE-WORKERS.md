# BDL MCP Server - Cloudflare Workers Deployment

Deploy serwera MCP GUS na Cloudflare Workers - globalną sieć edge computing.

## 🚀 Zalety Cloudflare Workers

- ✅ **Globalny edge network** - 300+ lokalizacji na świecie
- ✅ **Darmowy tier** - 100,000 requestów/dzień
- ✅ **Ultraszybki** - cold start <1ms
- ✅ **Automatyczne HTTPS** - certyfikaty SSL
- ✅ **Brak serwerów** - zero maintenance
- ✅ **TypeScript** - type-safe development

## 📋 Wymagania

- Node.js 18+ i npm
- Konto Cloudflare (darmowe): https://dash.cloudflare.com/sign-up
- Wrangler CLI

## 🔧 Instalacja

### 1. Zainstaluj zależności

```bash
npm install
```

### 2. Zaloguj się do Cloudflare

```bash
npx wrangler login
```

To otworzy przeglądarkę - zaloguj się do Cloudflare.

### 3. (Opcjonalnie) Edytuj konfigurację

Edytuj `wrangler.toml`:

```toml
name = "mcp-gus-workers"  # Zmień nazwę workera
account_id = "YOUR_ACCOUNT_ID"  # Twoje Cloudflare account ID
```

Znajdź account ID:
```bash
npx wrangler whoami
```

## 🚀 Deployment

### Development (lokalny)

```bash
npm run dev
```

Worker będzie dostępny na `http://localhost:8787`

Test:
```bash
curl http://localhost:8787/health
```

### Production

```bash
npm run deploy
```

Po deploymencie otrzymasz URL:
```
https://mcp-gus-workers.YOUR_SUBDOMAIN.workers.dev
```

## 🧪 Testowanie

### Health check

```bash
curl https://mcp-gus-workers.YOUR_SUBDOMAIN.workers.dev/health
```

Odpowiedź:
```json
{
  "status": "ok",
  "service": "mcp-gus-workers",
  "version": "0.1.0",
  "environment": "production",
  "edge": "WAW"
}
```

### MCP Request

```bash
curl -X POST https://mcp-gus-workers.YOUR_SUBDOMAIN.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### Tool Call - Lista województw

```bash
curl -X POST https://mcp-gus-workers.YOUR_SUBDOMAIN.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_units",
      "arguments": {
        "level": 2,
        "lang": "pl"
      }
    }
  }'
```

## 📁 Struktura Projektu

```
.
├── src/
│   └── index.ts          # Główny kod Workers
├── wrangler.toml         # Konfiguracja Cloudflare Workers
├── package.json          # Zależności Node.js
├── tsconfig.json         # Konfiguracja TypeScript
└── README-CLOUDFLARE-WORKERS.md
```

## ⚙️ Konfiguracja

### Custom Domain

Aby używać własnej domeny (np. `mcp.twoja-domena.com`):

1. Dodaj domenę do Cloudflare
2. Edytuj `wrangler.toml`:

```toml
routes = [
  { pattern = "mcp.twoja-domena.com/*", zone_name = "twoja-domena.com" }
]
```

3. Deploy:

```bash
npm run deploy
```

### Environment Variables

Dodaj zmienne środowiskowe w `wrangler.toml`:

```toml
[vars]
BDL_API_KEY = "your_api_key_if_needed"
ENVIRONMENT = "production"
```

Lub przez Cloudflare Dashboard:
- Workers & Pages → Your Worker → Settings → Variables

### Caching (KV Storage)

Dla cachowania odpowiedzi z BDL API:

1. Stwórz KV namespace:

```bash
npx wrangler kv:namespace create MCP_CACHE
```

2. Dodaj do `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "MCP_CACHE"
id = "YOUR_KV_NAMESPACE_ID"
```

3. Użyj w kodzie:

```typescript
// Sprawdź cache
const cached = await env.MCP_CACHE.get(cacheKey);
if (cached) return JSON.parse(cached);

// Zapisz do cache (TTL 1 godzina)
await env.MCP_CACHE.put(cacheKey, JSON.stringify(result), {
  expirationTtl: 3600,
});
```

## 📊 Monitoring

### Logs (tail)

Zobacz logi na żywo:

```bash
npm run tail
```

### Analytics

Cloudflare Dashboard:
- Workers & Pages → Your Worker → Metrics
- Zobacz requesty, błędy, latency

### Limits

Darmowy plan:
- 100,000 requestów/dzień
- 10ms CPU time per request
- 128 MB memory

Paid plan ($5/month):
- 10 milionów requestów/miesiąc
- 50ms CPU time
- Nieograniczona pamięć

## 🔐 Bezpieczeństwo

### Rate Limiting

Dodaj rate limiting:

```typescript
// W src/index.ts
const rateLimiter = new Map<string, number>();

// Sprawdź rate limit
const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
const count = rateLimiter.get(ip) || 0;

if (count > 100) {
  return new Response('Rate limit exceeded', { status: 429 });
}

rateLimiter.set(ip, count + 1);
```

### Authentication

Dodaj API key auth:

```typescript
const apiKey = request.headers.get('Authorization');
if (apiKey !== `Bearer ${env.API_KEY}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

## 🐛 Troubleshooting

### Error: "No account_id found"

Ustaw account ID w `wrangler.toml`:

```bash
npx wrangler whoami
# Skopiuj account ID do wrangler.toml
```

### Error: "CPU time limit exceeded"

Workers mają limit 10ms (darmowy) lub 50ms (paid). Optymalizuj kod lub:
- Użyj cachowania (KV)
- Ogranicz liczbę API calls
- Użyj Durable Objects dla długich operacji

### Error: "Worker size too large"

Maksymalny rozmiar: 1MB (darmowy) lub 10MB (paid).
- Usuń nieużywane zależności
- Użyj tree-shaking
- Minifikuj kod

## 📚 Dokumentacja

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Examples](https://developers.cloudflare.com/workers/examples/)
- [MCP Protocol](https://modelcontextprotocol.io/)

## 🆚 Porównanie: Workers vs Python Server

| Feature | Cloudflare Workers | Python (uvicorn) |
|---------|-------------------|------------------|
| Deployment | Automatic edge | Manual VPS/container |
| Cold start | <1ms | ~100-500ms |
| Geographic | 300+ locations | 1 location |
| Scaling | Automatic | Manual |
| Cost | Free tier | VPS cost |
| Language | TypeScript/JS | Python |
| SSE | Limited | Full support |

**Rekomendacja:**
- **Workers**: API, webhooks, stateless operations
- **Python**: Desktop MCP (stdio), stateful SSE sessions

## 🎯 Kolejne Kroki

1. **Dodaj więcej tools** - pełna implementacja wszystkich endpointów BDL
2. **Caching** - użyj KV dla cachowania odpowiedzi
3. **Rate limiting** - ogranicz abuse
4. **Custom domain** - własna domena
5. **Monitoring** - integracja z zewnętrznymi systemami

## 💡 Tips

- Workers są świetne dla read-only API
- Użyj KV dla cachowania (TTL)
- Edge compute = niskie latency
- Darmowy tier wystarczy dla większości use cases
- Deploy jest instant (< 5 sekund)

---

**Pytania?** Otwórz issue: https://github.com/dvvbk/mcp-gus/issues
