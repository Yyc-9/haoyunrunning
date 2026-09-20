import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { supabaseAdmin } from '@/lib/supabase-server'
import { legacyPaymentDisplay, validatePaymentDisplay, paymentDisplaySvg } from '@/lib/payment-display'

export async function getPaymentDisplay() {
  if (!supabaseAdmin) throw new Error('收款資料服務尚未設定。')
  const { data, error } = await supabaseAdmin.from('payment_display_settings').select('value, updated_at').eq('id', true).maybeSingle()
  if (error) throw new Error('收款資料暫時無法讀取，請稍後重試。')
  const config = data ? validatePaymentDisplay(data.value) : { ...legacyPaymentDisplay, useLegacyQr: true }
  const info = config.useLegacyQr ? { ...config, qrCodeUrl: `data:image/png;base64,${(await readFile(join(process.cwd(), 'private/course-registration/payment-qr.png'))).toString('base64')}` } : config
  return { info, config, version: data?.updated_at as string | undefined ?? null }
}

export async function paymentDisplayImage() {
  const { info, version } = await getPaymentDisplay()
  return version
    ? { bytes: paymentDisplaySvg(info), contentType: 'image/svg+xml', filename: 'payment-info.svg' }
    : { bytes: new Uint8Array(await readFile(join(process.cwd(), 'private/course-registration/payment-info.jpg'))), contentType: 'image/jpeg', filename: 'payment-info.jpg' }
}
