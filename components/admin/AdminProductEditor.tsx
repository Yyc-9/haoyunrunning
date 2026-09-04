'use client'

import AdminProductForm from '@/components/admin/AdminProductForm'
import type { AdminEditableProduct, ProductAction, ProductEditState, ProductMediaUpload } from '@/lib/admin-products'

export type { AdminEditableProduct } from '@/lib/admin-products'

export default function AdminProductEditor(props: {
  product: AdminEditableProduct
  categories?: string[]
  runAction: ProductAction
  onStateChange?: (state: ProductEditState) => void
  uploadMedia?: ProductMediaUpload
}) {
  return <AdminProductForm {...props} />
}
