import ProductDetailClient from './ProductDetailClient'

type ProductDetailPageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { id } = await params
  return {
    title: `商品詳情 - 好運商店`,
    description: `查看好運商店商品 ${decodeURIComponent(id)} 的圖片、價格、規格與庫存。`,
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params
  return <ProductDetailClient productId={decodeURIComponent(id)} />
}
