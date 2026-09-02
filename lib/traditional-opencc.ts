import { Converter } from 'opencc-js'

const simplifiedToTraditional = Converter({ from: 'cn', to: 'tw' })
const traditionalToSimplified = Converter({ from: 'tw', to: 'cn' })

export function toTraditionalWithOpenCC(value: string) {
  return simplifiedToTraditional(value)
    .replaceAll('馬拉鬆', '馬拉松')
    .replaceAll('週賢峰', '周賢峰')
}

export function toSimplifiedWithOpenCC(value: string) {
  return traditionalToSimplified(value)
    .replaceAll('马拉鬆', '马拉松')
    .replaceAll('週贤峰', '周贤峰')
}
