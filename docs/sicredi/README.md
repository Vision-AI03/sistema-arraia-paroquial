# Sicredi PIX — Integração

## Arquivos esperados nesta pasta

- `guia-tecnico-api-pix-sicredi.pdf` — baixar no portal dev após aprovação do ticket #222610.
- `collection-postman.json` — mesmo local.
- `certificado.pfx` (ou `.p12`) — **NUNCA commitar**. Já está no `.gitignore`.
- `certificado.senha.txt` — **NUNCA commitar**.

## Secrets do Supabase (produção)

Depois de receber as credenciais, rodar:

```bash
supabase secrets set \
  SICREDI_CLIENT_ID="..." \
  SICREDI_CLIENT_SECRET="..." \
  SICREDI_CERT_BASE64="$(base64 -w0 docs/sicredi/certificado.pfx)" \
  SICREDI_CERT_PASSWORD="..." \
  SICREDI_CHAVE_PIX="..." \
  SICREDI_ENV="homolog"   # depois trocar para "prod"
```

Endpoints (do Guia Técnico — confirmar após download):

- Homolog: `https://api-pix-h.sicredi.com.br`
- Prod: `https://api-pix.sicredi.com.br`

## Deploy das Edge Functions

```bash
supabase functions deploy sicredi-cobranca
supabase functions deploy sicredi-webhook
```

## Registrar webhook (uma vez)

```bash
curl -X PUT "$SICREDI_URL/api/v2/webhook/$SICREDI_CHAVE_PIX" \
  --cert-type P12 --cert docs/sicredi/certificado.pfx:$SICREDI_CERT_PASSWORD \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl":"https://<supabase-ref>.functions.supabase.co/sicredi-webhook"}'
```

## Frontend

Setar `.env` de produção:

```
VITE_MODO_SIMULADO=false
```

## Checklist go-live

- [ ] Ticket #222610 aprovado, API PIX visível no portal
- [ ] Credenciais + certificado em mãos
- [ ] Migration 0011 aplicada
- [ ] Secrets configurados
- [ ] Functions deployadas
- [ ] Webhook registrado
- [ ] Sandbox: 1 cobrança criada, 1 pagamento simulado, webhook atualizou pedido
- [ ] Produção: 1 pagamento real de R$0,01 validado
- [ ] `VITE_MODO_SIMULADO=false` em produção
