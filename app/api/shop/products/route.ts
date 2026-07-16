import { NextRequest, NextResponse } from 'next/server'
import { shopProductFromRow, type ShopProductRow } from '@/lib/shop-products'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
}

function unavailable(message = '商品資料暫時無法載入。') {
  return NextResponse.json(
    { products: [], product: null, source: 'unavailable', error: message },
    { status: 503, headers: noStoreHeaders }
  )
}

function isOptionalSchemaError(error: { code?: string; message?: string } | null) {
  if (!error) return false

  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    /schema cache|does not exist|column .* does not exist/i.test(error.message ?? '')
  )
}

export async function GET(request: NextRequest) {
  const requestedId = request.nextUrl.searchParams.get('id')?.trim() ?? ''

  if (!supabaseAdmin) return unavailable('商品資料服務尚未設定。')

  try {
    const { data, error } = await supabaseAdmin
      .from('shop_products')
      .select('id, name, category, price, price_label, image, video, rating, reviews, tags, summary, description, gallery, highlights, specifications, usage_notes, external_url, variants, sizes, stock_quantity, active')
      .eq('active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      const label = isOptionalSchemaError(error) ? 'schema' : 'query'
      console.error(`Shop products ${label} error:`, error)
      return unavailable()
    }

    const products = (data ?? [])
      .map((row) => shopProductFromRow(row as ShopProductRow))
      .filter((product) => !requestedId || product.id === requestedId)
    return NextResponse.json(
      { products, product: products[0] ?? null, source: 'database' },
      { headers: noStoreHeaders }
    )
  } catch (error) {
    console.error('Shop products request failed:', error)
    return unavailable()
  }
}
