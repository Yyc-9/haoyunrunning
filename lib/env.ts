/**
 * 環境变量驗證工具
 * 在应用启动时檢查必需的環境变量
 */

export interface EnvConfig {
  // 应用設定
  nodeEnv: 'development' | 'production' | 'test'
  siteUrl: string
  appName: string

  // Supabase 設定 (可选)
  supabaseUrl?: string
  supabaseAnonKey?: string
  supabaseServiceRoleKey?: string

  // 文件上傳
  maxFileSize: number
  allowedFileTypes: string[]

  // 调試
  debugMode: boolean
}

function getNodeEnv(value: string | undefined): EnvConfig['nodeEnv'] {
  if (value === 'production' || value === 'test') return value
  return 'development'
}

/**
 * 从環境变量加载設定
 */
export function loadEnvConfig(): EnvConfig {
  const requiredEnvs = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_APP_NAME',
  ]

  // 檢查必需環境变量
  const missing = requiredEnvs.filter(env => !process.env[env])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please check your .env.local file.`
    )
  }

  // 解析檔案類型
  const fileTypesStr = process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif'
  const allowedFileTypes = fileTypesStr.split(',').map(t => t.trim())

  const config: EnvConfig = {
    nodeEnv: getNodeEnv(process.env.NODE_ENV),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL!,
    appName: process.env.NEXT_PUBLIC_APP_NAME || '好運跑班',
    maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10', 10),
    allowedFileTypes,
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  }

  // 可选的 Supabase 設定
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    config.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    config.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    config.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  }

  // 驗證 Supabase 設定的一致性
  if (config.supabaseUrl && !config.supabaseAnonKey) {
    console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Supabase features will be unavailable.')
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('✓ Environment configuration loaded successfully')
    if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
      console.log('Debug mode is enabled')
    }
  }

  return config
}

/**
 * 获取缓存的設定
 */
let cachedConfig: EnvConfig | null = null

export function getConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = loadEnvConfig()
  }
  return cachedConfig
}

/**
 * 檢查是否已設定 Supabase
 */
export function isSupabaseConfigured(): boolean {
  const config = getConfig()
  return !!(config.supabaseUrl && config.supabaseAnonKey)
}

/**
 * 驗證文件上傳
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const config = getConfig()

  // 檢查文件大小
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > config.maxFileSize) {
    return {
      valid: false,
      error: `文件大小不能超過 ${config.maxFileSize}MB`,
    }
  }

  // 檢查檔案類型
  if (!config.allowedFileTypes.includes(file.type)) {
    return {
      valid: false,
      error: `不支援的檔案類型: ${file.type}`,
    }
  }

  return { valid: true }
}

/**
 * 驗證信箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 驗證 URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
