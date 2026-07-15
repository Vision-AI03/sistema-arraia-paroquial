// Cliente compartilhado da API PIX Sicredi.
// Usa mTLS: certificado .pfx (base64) + senha, mais Client_ID/Secret pra OAuth.

const ENV = Deno.env.get('SICREDI_ENV') ?? 'homolog'

export const SICREDI_BASE_URL =
  ENV === 'prod'
    ? 'https://api-pix.sicredi.com.br'
    : 'https://api-pix-h.sicredi.com.br'

let cachedToken: { value: string; expiresAt: number } | null = null

function readSecrets() {
  const clientId = Deno.env.get('SICREDI_CLIENT_ID')
  const clientSecret = Deno.env.get('SICREDI_CLIENT_SECRET')
  const certPem = Deno.env.get('SICREDI_CERT_PEM')
  const keyPem = Deno.env.get('SICREDI_KEY_PEM')
  const chavePix = Deno.env.get('SICREDI_CHAVE_PIX')

  if (!clientId || !clientSecret || !certPem || !keyPem || !chavePix) {
    throw new Error(
      'Credenciais Sicredi ausentes: verificar SICREDI_CLIENT_ID, SICREDI_CLIENT_SECRET, SICREDI_CERT_PEM, SICREDI_KEY_PEM, SICREDI_CHAVE_PIX',
    )
  }
  return { clientId, clientSecret, certPem, keyPem, chavePix }
}

// Deno 1.x expunha Deno.createHttpClient, removido em Deno 2.
// Como o runtime das Edge Functions do Supabase varia, tentamos usar quando disponível.
// O certificado precisa ser convertido de .pfx para PEM (chave + cert) antes de subir como secret,
// OU a Sicredi aceita basic auth só para /oauth/token em algumas cooperativas — confirmar no Guia Técnico.
async function buildMtlsClient() {
  const { certPem, keyPem } = readSecrets()
  const anyDeno = Deno as unknown as {
    createHttpClient?: (opts: unknown) => unknown
  }
  if (typeof anyDeno.createHttpClient !== 'function') {
    console.warn('[sicredi] Deno.createHttpClient indisponível — mTLS desabilitado neste runtime.')
    return null
  }
  return anyDeno.createHttpClient({ cert: certPem, key: keyPem })
}

export async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value
  }

  const { clientId, clientSecret } = readSecrets()
  const client = await buildMtlsClient()

  const basic = btoa(`${clientId}:${clientSecret}`)

  const resp = await fetch(
    `${SICREDI_BASE_URL}/oauth/token?grant_type=client_credentials`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      ...(client ? { client } : {}),
    } as RequestInit,
  )

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Sicredi OAuth falhou (${resp.status}): ${text}`)
  }

  const data = (await resp.json()) as { access_token: string; expires_in: number }
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }
  return data.access_token
}

// txid: 26–35 chars alfanuméricos (regra do BACEN). UUID sem hífen tem 32 — dentro da faixa.
export function novoTxid(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export interface CobrancaCriada {
  txid: string
  location: string
  pixCopiaECola: string
}

export async function registrarWebhook(webhookUrl: string): Promise<void> {
  const { chavePix } = readSecrets()
  const token = await getAccessToken()
  const client = await buildMtlsClient()

  const resp = await fetch(
    `${SICREDI_BASE_URL}/api/v2/webhook/${encodeURIComponent(chavePix)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ webhookUrl }),
      ...(client ? { client } : {}),
    } as RequestInit,
  )

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Sicredi registrarWebhook falhou (${resp.status}): ${text}`)
  }
}

export async function consultarCobranca(txid: string): Promise<{
  status: string
  pix?: Array<{ endToEndId: string; valor: string; horario: string }>
}> {
  const token = await getAccessToken()
  const client = await buildMtlsClient()

  const resp = await fetch(`${SICREDI_BASE_URL}/api/v3/cob/${txid}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    ...(client ? { client } : {}),
  } as RequestInit)

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Sicredi consultarCobranca falhou (${resp.status}): ${text}`)
  }

  return await resp.json()
}

export async function criarCobranca(params: {
  txid: string
  valor: number
  descricao: string
  expiracaoSegundos?: number
}): Promise<CobrancaCriada> {
  const { chavePix } = readSecrets()
  const token = await getAccessToken()
  const client = await buildMtlsClient()

  const body = {
    calendario: { expiracao: params.expiracaoSegundos ?? 1800 },
    valor: { original: params.valor.toFixed(2) },
    chave: chavePix,
    solicitacaoPagador: params.descricao.slice(0, 140),
  }

  const resp = await fetch(`${SICREDI_BASE_URL}/api/v3/cob/${params.txid}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    ...(client ? { client } : {}),
  } as RequestInit)

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Sicredi criarCobranca falhou (${resp.status}): ${text}`)
  }

  const data = (await resp.json()) as {
    location: string
    pixCopiaECola: string
  }
  return {
    txid: params.txid,
    location: data.location,
    pixCopiaECola: data.pixCopiaECola,
  }
}
