/**
 * 搜尋和過滤工具
 */

export interface SearchOptions {
  query: string
  filters: Record<string, string | number | boolean | Array<string | number | boolean>>
  sortBy: 'relevance' | 'price-low' | 'price-high' | 'rating' | 'newest'
  limit: number
  offset: number
}

export interface SearchResult<T> {
  items: T[]
  total: number
  hasMore: boolean
}

/**
 * 簡單的搜尋引擎實現
 */
export class SearchEngine<T extends Record<string, unknown>> {
  private items: T[]
  private searchableFields: (keyof T)[]

  constructor(items: T[], searchableFields: (keyof T)[]) {
    this.items = items
    this.searchableFields = searchableFields
  }

  /**
   * 执行搜尋
   */
  search(options: Partial<SearchOptions> = {}): SearchResult<T> {
    let results = [...this.items]

    // 文本搜尋
    if (options.query) {
      const query = options.query.toLowerCase()
      results = results.filter(item =>
        this.searchableFields.some(field => {
          const value = String(item[field]).toLowerCase()
          return value.includes(query)
        })
      )
    }

    // 應用過滤器
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        results = results.filter(item => {
          const itemValue = item[key as keyof T]
          if (Array.isArray(value)) {
            return value.some((filterValue) => String(filterValue) === String(itemValue))
          }
          return String(itemValue) === String(value)
        })
      })
    }

    // 排序
    if (options.sortBy) {
      results = this.sort(results, options.sortBy)
    }

    // 分頁
    const offset = options.offset || 0
    const limit = options.limit || 10
    const paginatedResults = results.slice(offset, offset + limit)

    return {
      items: paginatedResults,
      total: results.length,
      hasMore: offset + limit < results.length,
    }
  }

  /**
   * 取得過滤選項
   */
  getFilterOptions(field: keyof T): (string | number)[] {
    const values = new Set<string | number>()
    this.items.forEach(item => {
      const value = item[field]
      if (value !== null && value !== undefined) {
        values.add(value as string | number)
      }
    })
    return Array.from(values).sort()
  }

  /**
   * 取得搜尋建議
   */
  getSuggestions(query: string, limit: number = 5): string[] {
    if (!query) return []

    const queryLower = query.toLowerCase()
    const suggestions = new Set<string>()

    this.searchableFields.forEach(field => {
      this.items.forEach(item => {
        const value = String(item[field]).toLowerCase()
        if (value.includes(queryLower) && value !== queryLower) {
          suggestions.add(String(item[field]))
        }
      })
    })

    return Array.from(suggestions)
      .filter(s => s.toLowerCase().includes(queryLower))
      .slice(0, limit)
  }

  /**
   * 排序結果
   */
  private sort(items: T[], sortBy: string): T[] {
    const sorted = [...items]

    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0))
      case 'price-high':
        return sorted.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0))
      case 'rating':
        return sorted.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0))
      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = new Date(String(a.createdAt ?? 0)).getTime()
          const dateB = new Date(String(b.createdAt ?? 0)).getTime()
          return dateB - dateA
        })
      case 'relevance':
      default:
        return sorted
    }
  }
}

/**
 * 模糊搜尋 (Fuzzy Search)
 */
export function fuzzyMatch(query: string, text: string): number {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()

  if (textLower.includes(queryLower)) {
    return 100 // 精确子串匹配
  }

  let score = 0
  let textIndex = 0

  for (let i = 0; i < queryLower.length; i++) {
    const char = queryLower[i]
    const foundIndex = textLower.indexOf(char, textIndex)

    if (foundIndex === -1) {
      return 0 // 未找到字符
    }

    // 連續字符得分更高
    const distance = foundIndex - textIndex
    score += distance === 0 ? 10 : Math.max(0, 10 - distance)
    textIndex = foundIndex + 1
  }

  return score
}

/**
 * 生成搜尋索引
 */
export function createSearchIndex<T extends Record<string, unknown>>(
  items: T[],
  fields: (keyof T)[]
): Map<string, T[]> {
  const index = new Map<string, T[]>()

  items.forEach(item => {
    fields.forEach(field => {
      const value = String(item[field]).toLowerCase()
      const words = value.split(/\s+/)

      words.forEach(word => {
        if (word.length > 0) {
          if (!index.has(word)) {
            index.set(word, [])
          }
          index.get(word)!.push(item)
        }
      })
    })
  })

  return index
}
