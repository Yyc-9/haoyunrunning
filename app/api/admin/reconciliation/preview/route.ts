import { NextRequest, NextResponse } from 'next/server'
import { authenticateFinanceRequest, financeNoStoreHeaders } from '@/lib/finance-access'
import { buildBankFilePreview, readBankWorkbook } from '@/lib/bank-reconciliation'

export const runtime = 'nodejs'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...financeNoStoreHeaders(),
      ...(init?.headers ?? {}),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateFinanceRequest(request)
  if ('response' in auth) return auth.response

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const requestedSheet = typeof formData.get('sheetName') === 'string'
      ? String(formData.get('sheetName')).trim()
      : ''
    const headerRow = Number(formData.get('headerRow'))

    if (!(file instanceof File)) {
      return json({ error: '請選擇銀行下載的 XLSX 或 CSV 檔案。' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { workbook, sheetNames } = await readBankWorkbook(buffer, file.name, requestedSheet)
    const preview = buildBankFilePreview({
      workbook,
      sheetNames,
      fileName: file.name,
      fileSize: file.size,
      buffer,
      headerRow,
    })

    return json({ preview })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : '銀行檔案預覽失敗。' },
      { status: 400 }
    )
  }
}
