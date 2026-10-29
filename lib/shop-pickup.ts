export type PickupOption = { id: string; name: string }
export type PickupStatus = 'pending' | 'packed' | 'collected'
export type PickupItem = { product_id: string; name: string; quantity: number; size: string; variant_id: string; selected_specifications: Array<{ label: string; value: string }>; is_preorder: boolean }
export type PickupOrder = {
  id: string; order_number: string; customer_name: string; email: string; contact: string;
  status: string; updated_at: string; pickup_course_id: string | null; pickup_class_name: string;
  pickup_status: PickupStatus; pickup_match_source: string; shop_order_items: PickupItem[];
  candidates: PickupOption[]
}
export const pickupLabels: Record<PickupStatus,string> = { pending:'待配貨', packed:'已配貨', collected:'已領取' }
export function effectivePickup(order: PickupOrder): PickupOption | null {
  if (order.pickup_course_id) return { id:order.pickup_course_id,name:order.pickup_class_name }
  return order.pickup_match_source === 'unmatched' && order.candidates.length === 1 ? order.candidates[0] : null
}
export function packingSummary(orders: PickupOrder[]) {
  const groups = new Map<string,{ className:string; name:string; size:string; variant:string; specs:string; preorder:boolean; quantity:number }>()
  for (const order of orders) {
    // A packing list includes only paid orders still awaiting packing.
    if (order.status !== 'approved' || order.pickup_status !== 'pending') continue
    const pickup = effectivePickup(order)
    if (!pickup) continue
    for (const item of order.shop_order_items) {
      const selections = [...(item.selected_specifications ?? [])].sort((a,b)=>a.label.localeCompare(b.label)||a.value.localeCompare(b.value))
      const key = JSON.stringify([pickup.id,item.product_id,item.size,item.variant_id,selections,item.is_preorder])
      const row = groups.get(key) ?? { className:pickup.name,name:item.name,size:item.size,variant:item.variant_id,specs:selections.map(s=>s.label+'：'+s.value).join('；'),preorder:item.is_preorder,quantity:0 }
      row.quantity += item.quantity
      groups.set(key,row)
    }
  }
  return [...groups.values()]
}

