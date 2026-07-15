// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { registrarWebhook, consultarCobranca } from '../_shared/sicredi.ts'

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

  let payload: { acao?: string; webhook_url?: string; pedido_id?: string }
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'json inválido' })
  }

  const acao = payload.acao
  if (!acao) return json(400, { error: 'acao ausente (registrar_webhook | reconciliar_pedido)' })

  if (acao === 'registrar_webhook') {
    const url = payload.webhook_url
    if (!url) return json(400, { error: 'webhook_url ausente' })
    try {
      await registrarWebhook(url)
      return json(200, { ok: true, webhook_url: url })
    } catch (e: any) {
      console.error('[sicredi-admin] registrar_webhook', e?.message ?? e)
      return json(502, { error: 'falha ao registrar webhook', detail: String(e?.message ?? e) })
    }
  }

  if (acao === 'reconciliar_pedido') {
    const pedidoId = payload.pedido_id
    if (!pedidoId) return json(400, { error: 'pedido_id ausente' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return json(500, { error: 'supabase secrets ausentes' })
    const supa = createClient(supabaseUrl, serviceKey)

    const { data: pedido, error: pedErr } = await supa
      .from('pedidos')
      .select('id, status_pagto, sicredi_txid')
      .eq('id', pedidoId)
      .single()

    if (pedErr || !pedido) {
      return json(404, { error: 'pedido não encontrado', detail: pedErr?.message })
    }
    if (!pedido.sicredi_txid) {
      return json(400, { error: 'pedido sem sicredi_txid — cobrança não foi criada' })
    }
    if (pedido.status_pagto === 'pago') {
      return json(200, { ok: true, ja_pago: true })
    }

    try {
      const cob = await consultarCobranca(pedido.sicredi_txid)
      const pagoNaSicredi = cob.status === 'CONCLUIDA' && (cob.pix?.length ?? 0) > 0
      if (!pagoNaSicredi) {
        return json(200, {
          ok: true,
          pago: false,
          status_sicredi: cob.status,
        })
      }
      const primeiroPix = cob.pix![0]
      const { error: rpcErr } = await supa.rpc('confirmar_pagamento_sicredi', {
        p_txid: pedido.sicredi_txid,
        p_e2eid: primeiroPix.endToEndId,
      })
      if (rpcErr) {
        console.error('[sicredi-admin] confirmar_pagamento_sicredi', rpcErr)
        return json(500, { error: 'falha ao confirmar', detail: rpcErr.message })
      }
      return json(200, {
        ok: true,
        pago: true,
        e2eid: primeiroPix.endToEndId,
        valor: primeiroPix.valor,
      })
    } catch (e: any) {
      console.error('[sicredi-admin] reconciliar', e?.message ?? e)
      return json(502, { error: 'falha ao consultar Sicredi', detail: String(e?.message ?? e) })
    }
  }

  return json(400, { error: `acao desconhecida: ${acao}` })
})
