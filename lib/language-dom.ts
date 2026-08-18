import type { Language } from '@/lib/dictionary'
import { toEnglishWebsiteText } from '@/lib/english-website'
import {
  toSimplifiedWebsiteText,
  toTraditionalWebsiteText,
} from '@/lib/traditional-chinese'

type RememberedValue = {
  source: string
  localized: string
}

export type LocalizationMemory = WeakMap<object, Map<string, RememberedValue>>

export function createLocalizationMemory(): LocalizationMemory {
  return new WeakMap<object, Map<string, RememberedValue>>()
}

export type LazyLanguageConverter = {
  toTraditional?: (value: string) => string
  toSimplified?: (value: string) => string
}

function convertWebsiteText(value: string, language: Language, converter?: LazyLanguageConverter) {
  if (language === 'en') return toEnglishWebsiteText(value)
  if (language === 'zh-CN') return converter?.toSimplified?.(value) ?? toSimplifiedWebsiteText(value)
  return converter?.toTraditional?.(value) ?? toTraditionalWebsiteText(value)
}

export function localizeRememberedValue(
  owner: object,
  slot: string,
  currentValue: string,
  language: Language,
  memory: LocalizationMemory,
  converter?: LazyLanguageConverter,
) {
  let slots = memory.get(owner)
  if (!slots) {
    slots = new Map<string, RememberedValue>()
    memory.set(owner, slots)
  }

  const previous = slots.get(slot)
  const source = previous && currentValue === previous.localized
    ? previous.source
    : currentValue
  const localized = convertWebsiteText(source, language, converter)

  slots.set(slot, { source, localized })
  return localized
}
