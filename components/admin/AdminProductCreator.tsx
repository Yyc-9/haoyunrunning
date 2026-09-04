'use client'

import AdminProductForm from '@/components/admin/AdminProductForm'
import type { ProductAction, ProductEditState, ProductMediaUpload } from '@/lib/admin-products'

export { uploadProductMedia } from '@/lib/admin-product-media'

export default function AdminProductCreator(props: {
  categories?: string[]
  runAction: ProductAction
  onStateChange?: (state: ProductEditState) => void
  onSaved?: (name: string) => void
  onCancel?: () => void
  uploadMedia?: ProductMediaUpload
}) {
  return <AdminProductForm {...props} />
}
