// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { criarCobranca, novoTxid } from '../_shared/sicredi.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' })

  let payload: { pedido_id?: string }
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'json inválido' })
  }

  const pedidoId = payload.pedido_id
  if (!pedidoId) return json(400, { error: 'pedido_id ausente' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'supabase secrets ausentes' })
  }
  const supa = createClient(supabaseUrl, serviceKey)

  const { data: pedido, error: pedErr } = await supa
    .from('pedidos')
    .select('id, total, status_pagto, sicredi_txid, mp_qr_code')
    .eq('id', pedidoId)
    .single()

  if (pedErr || !pedido) {
    console.error('[sicredi-cobranca] buscar pedido', {
      pedidoId,
      error: pedErr?.message,
      code: pedErr?.code,
      details: pedErr?.details,
    })
    return json(404, {
      error: 'pedido não encontrado',
      detail: pedErr?.message,
      code: pedErr?.code,
      pedido_id: pedidoId,
    })
  }
  if (pedido.status_pagto !== 'pendente')
    return json(409, { error: `pedido não está pendente (${pedido.status_pagto})` })

  // Idempotência: se já tem txid, retorna o payload existente sem chamar Sicredi.
  if (pedido.sicredi_txid && pedido.mp_qr_code) {
    return json(200, {
      txid: pedido.sicredi_txid,
      pix_copia_cola: pedido.mp_qr_code,
    })
  }

  const txid = novoTxid()
  let cob
  try {
    cob = await criarCobranca({
      txid,
      valor: Number(pedido.total),
      descricao: `Arraia Paroquial - Pedido ${pedidoId.slice(0, 8)}`,
    })
  } catch (e: any) {
    console.error('[sicredi-cobranca]', e?.message ?? e)
    return json(502, { error: 'falha ao criar cobrança', detail: String(e?.message ?? e) })
  }

  const { error: regErr } = await supa.rpc('registrar_cobranca_sicredi', {
    p_pedido_id: pedidoId,
    p_txid: cob.txid,
    p_location: cob.location,
    p_copia_cola: cob.pixCopiaECola,
  })
  if (regErr) {
    console.error('[sicredi-cobranca] registrar_cobranca_sicredi', regErr)
    return json(500, { error: 'falha ao registrar cobrança', detail: regErr.message })
  }

  return json(200, {
    txid: cob.txid,
    pix_copia_cola: cob.pixCopiaECola,
    location: cob.location,
  })
})
