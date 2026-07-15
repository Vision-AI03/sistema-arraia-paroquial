// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2'

// A Sicredi POSTa notificações no formato:
// { "pix": [ { "endToEndId": "...", "txid": "...", "valor": "...", "horario": "..." } ] }

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response('json inválido', { status: 400 })
  }

  const pixArr = Array.isArray(body?.pix) ? body.pix : []
  if (pixArr.length === 0) {
    // A Sicredi também POSTa payloads de teste sem "pix" — responder 200 pra ela não desativar o webhook.
    return new Response('ok', { status: 200 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response('secrets ausentes', { status: 500 })
  }
  const supa = createClient(supabaseUrl, serviceKey)

  const erros: string[] = []
  for (const p of pixArr) {
    const txid = p?.txid
    const e2eid = p?.endToEndId
    if (!txid || !e2eid) {
      erros.push(`payload inválido: ${JSON.stringify(p)}`)
      continue
    }
    const { error } = await supa.rpc('confirmar_pagamento_sicredi', {
      p_txid: txid,
      p_e2eid: e2eid,
    })
    if (error) {
      console.error('[sicredi-webhook] confirmar_pagamento_sicredi', txid, error)
      erros.push(`${txid}: ${error.message}`)
    }
  }

  if (erros.length > 0) {
    // Retorna 200 mesmo assim pra Sicredi não retentar em loop; erros ficam em log.
    console.warn('[sicredi-webhook] processado com erros:', erros)
  }
  return new Response('ok', { status: 200 })
})
