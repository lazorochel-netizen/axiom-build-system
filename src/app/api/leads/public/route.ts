import { NextRequest, NextResponse } from 'next/server'
import { createClient as createRawClient } from '@supabase/supabase-js'

/**
 * POST /api/leads/public
 *
 * Public inbound lead webhook. Accepts JSON from:
 *  - axiomcamper.com.au contact form (GoDaddy hosted)
 *  - Zapier (Facebook Lead Ads, ManyChat, etc.)
 *
 * Auth: Bearer token must match LEAD_WEBHOOK_SECRET env var.
 *
 * Body (all optional except customer_name):
 * {
 *   customer_name:  string   (required)
 *   customer_email: string
 *   customer_phone: string
 *   vehicle_make:   string
 *   vehicle_model:  string
 *   vehicle_year:   number
 *   build_type:     string
 *   budget:         string
 *   source:         'website' | 'facebook' | 'instagram' | 'google' | 'phone' | 'walk_in' | 'referral' | 'other'
 *   temperature:    'warm' | 'cold'
 *   notes:          string
 * }
 *
 * Response 201: { id: string }
 * Response 400: { error: string }
 * Response 401: { error: 'Unauthorized' }
 */

// CORS headers — allow requests from any origin (axiomcamper.com.au + Zapier)
// To restrict: replace '*' with 'https://www.axiomcamper.com.au'
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────
  const secret = process.env.LEAD_WEBHOOK_SECRET
  if (!secret) {
    console.error('[leads/public] LEAD_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500, headers: CORS })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  // ── 2. Parse body ─────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS })
  }

  const customerName = (body.customer_name as string)?.trim()
  if (!customerName) {
    return NextResponse.json({ error: 'customer_name is required' }, { status: 400, headers: CORS })
  }

  // Whitelist valid sources
  const VALID_SOURCES = ['website', 'facebook', 'instagram', 'google', 'phone', 'walk_in', 'referral', 'other']
  const rawSource = (body.source as string) ?? ''
  const source = VALID_SOURCES.includes(rawSource) ? rawSource : 'other'

  // Whitelist valid temperatures
  const rawTemp = (body.temperature as string) ?? ''
  const temperature = rawTemp === 'warm' || rawTemp === 'cold' ? rawTemp : null

  // ── 3. Insert lead ────────────────────────────────────────
  const admin = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: lead, error } = await admin
    .from('leads')
    .insert({
      customer_name:  customerName,
      customer_email: (body.customer_email as string)?.trim() || null,
      customer_phone: (body.customer_phone as string)?.trim() || null,
      vehicle_make:   (body.vehicle_make  as string)?.trim() || null,
      vehicle_model:  (body.vehicle_model as string)?.trim() || null,
      vehicle_year:   Number(body.vehicle_year) || null,
      build_type:     (body.build_type    as string)?.trim() || null,
      budget:         (body.budget        as string)?.trim() || null,
      source,
      stage:          'new',
      temperature,
      notes:          (body.notes         as string)?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !lead) {
    console.error('[leads/public] Insert failed:', error)
    return NextResponse.json({ error: 'Could not save lead' }, { status: 500, headers: CORS })
  }

  return NextResponse.json({ id: lead.id }, { status: 201, headers: CORS })
}
