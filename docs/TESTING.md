# Testing Guide (Quick Reference)

## Prerequisites
- Server running: `npm run dev -p 3002`
- `.env.local` configured with:
  - NEXT_PUBLIC_PACKAGE_ID, NEXT_PUBLIC_MARKET_ID, SUI_RPC_URL
  - NEXT_PUBLIC_PINATA_GATEWAY, IPFS_GATEWAYS, IPFS_FETCH_TIMEOUT_MS, IPFS_FETCH_RETRIES
  - KEYS_ADMIN_TOKEN, DATABASE_URL
  - Cache policy: PROTECTED_CACHE_PRIVATE, PROTECTED_CACHE_MAX_AGE, PROTECTED_ENABLE_ETAG, PROTECTED_ENABLE_RANGE
  - Metrics: METRICS_ENABLED=true, METRICS_TOKEN=...
  - Optional caches: KEYS_CACHE_TTL_MS=60000, PROTECTED_CACHE_TTL_MS=120000

Replace placeholders as needed:
- WALLET=0x58e3a1aa87b9896d2170c775c0e6bf551abad92bc3f839704a71894e8c242d31
- MODEL_ID=19
- CID_ENC=QmbbmQZ3KMSnCufspLv3515X1rCCk8jUJf2AUfbe4DyCcd
- TOKEN=Npp59/pUUl3CUACE6QR1CnC52fHzbvZAbxn8Gp6/F3U=
- METRICS_TOKEN=<from .env.local>

## 1) Keys PUT/GET
- Unauthorized PUT (401):
```bash
curl -i -X POST http://localhost:3002/api/keys/put \
  -H "content-type: application/json" \
  -d '{"modelId":19,"slug":"MN8","keyB64":"UhIcwiH4faW+qD866MCqytno4Gnu6p2Pdxbz7eE/S/s="}'
```
- Authorized PUT (200):
```bash
curl -i -X POST http://localhost:3002/api/keys/put \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${TOKEN}" \
  -d '{"modelId":19,"slug":"MN8","keyB64":"UhIcwiH4faW+qD866MCqytno4Gnu6p2Pdxbz7eE/S/s="}'
```
- GET key (200):
```bash
curl -i "http://localhost:3002/api/keys/get?modelId=${MODEL_ID}&addr=${WALLET}"
```

## 2) Secure Fetch
- Full fetch (200):
```bash
curl -i "http://localhost:3002/api/protected/fetch?modelId=${MODEL_ID}&addr=${WALLET}&uri=ipfs://${CID_ENC}"
```
- Force gateway (optional):
```bash
curl -i "http://localhost:3002/api/protected/fetch?modelId=${MODEL_ID}&addr=${WALLET}&uri=ipfs://${CID_ENC}&gw=https://gateway.pinata.cloud"
```

## 3) ETag (304 Not Modified)
1) Do a secure fetch and copy the ETag (format W/"...").
2) Repeat with If-None-Match:
```bash
curl -i -H 'If-None-Match: W/"PASTE_ETAG_HERE"' \
  "http://localhost:3002/api/protected/fetch?modelId=${MODEL_ID}&addr=${WALLET}&uri=ipfs://${CID_ENC}"
```
Expected: `304 Not Modified`.

## 4) Range (206 Partial Content)
```bash
curl -i -H "Range: bytes=0-1023" \
  "http://localhost:3002/api/protected/fetch?modelId=${MODEL_ID}&addr=${WALLET}&uri=ipfs://${CID_ENC}"
```
Expected: `206`, `content-range: bytes 0-1023/<TOTAL>`, `content-length: 1024`.

## 5) Metrics (Prometheus)
```bash
curl -i http://localhost:3002/api/metrics \
  -H "authorization: Bearer ${METRICS_TOKEN}"
```
Look for series: `protected_fetch_total`, `keys_get_total`, `keys_put_total`, `gateway_failures_total`, and histograms `*_latency_ms_*`.

### Prometheus scrape example
```yaml
scrape_configs:
- job_name: 'marketplaceai'
  scrape_interval: 10s
  metrics_path: /api/metrics
  static_configs:
    - targets: ['host.docker.internal:3002']
  authorization:
    credentials: ${METRICS_TOKEN}
```

## 6) Troubleshooting
- 404 key not found: asegúrate de hacer el PUT y que `modelId/slug` coincidan.
- 403 no license: habilita `KEYS_BYPASS_ONCHAIN=true` en dev o adquiere licencia.
- 502 fetch-enc-failed: revisa `CID_ENC` y gateways; prueba con `&gw=`.
- 200 en ETag: verifica que `If-None-Match` sea exactamente el ETag (incluye comillas) y que los query params sean idénticos.
- 200 en Range: revisa el header `Range` y el tamaño del archivo (puede ser menor a 1024 bytes).
