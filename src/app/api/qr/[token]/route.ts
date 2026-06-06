import QRCode from 'qrcode'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/qr/[token]
 * Returns a PNG QR code image that links to /job/[token]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const jobUrl  = `${baseUrl}/job/${token}`

  const png = await QRCode.toBuffer(jobUrl, {
    type:   'png',
    width:  400,
    margin: 2,
    color:  { dark: '#0F172A', light: '#FFFFFF' },
  })

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type':  'image/png',
      'Cache-Control': 'no-store',
    },
  })
}
