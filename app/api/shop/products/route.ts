import { NextResponse } from 'next/server'
import { defaultShopProducts, shopProductFromRow, type ShopProductRow } from '@/lib/shop-products'
import { supabaseAdmin } from '@/lib/supabase-server'

const noStoreHeaders = {
  'Cache-Control': 'no-store',
}

function isOptionalSchemaError(error: { code?: string; message?: string } | null) {
  if (!error) return false

  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    /schema cache|does not exist|column .* does not exist/i.test(error.message ?? '')
  )
}

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ products: defaultShopProducts }, { headers: noStoreHeaders })
  }

  const { data, error } = await supabaseAdmin
    .from('shop_products')
    .select('id, name, category, price, price_label, image, rating, reviews, tags, variants, sizes, stock_quantity, active')
    .eq('active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    if (isOptionalSchemaError(error)) {
      return NextResponse.json({ products: defaultShopProducts }, { headers: noStoreHeaders })
    }

    return NextResponse.json({ error: error.message, products: defaultShopProducts }, { status: 500, headers: noStoreHeaders })
  }

  return NextResponse.json(
    { products: (data ?? []).map((row) => shopProductFromRow(row as ShopProductRow)) },
    { headers: noStoreHeaders }
  )
}
