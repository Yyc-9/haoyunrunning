/**
 * 环境变量验证工具
 * 在应用启动时检查必需的环境变量
 */

export interface EnvConfig {
  // 应用设置
  nodeEnv: 'development' | 'production' | 'test'
  siteUrl: string
  appName: string

  // Supabase 设置 (可选)
  supabaseUrl?: string
  supabaseAnonKey?: string
  supabaseServiceRoleKey?: string

  // 文件上传
  maxFileSize: number
  allowedFileTypes: string[]

  // 调试
  debugMode: boolean
}

/**
 * 从环境变量加载配置
 */
export function loadEnvConfig(): EnvConfig {
  const requiredEnvs = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_APP_NAME',
  ]

  const optionalEnvs = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  // 检查必需环境变量
  const missing = requiredEnvs.filter(env => !process.env[env])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please check your .env.local file.`
    )
  }

  // 解析文件类型
  const fileTypesStr = process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif'
  const allowedFileTypes = fileTypesStr.split(',').map(t => t.trim())

  const config: EnvConfig = {
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL!,
    appName: process.env.NEXT_PUBLIC_APP_NAME || '好運跑班',
    maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10', 10),
    allowedFileTypes,
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  }

  // 可选的 Supabase 配置
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    config.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    config.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    config.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  }

  // 验证 Supabase 配置的一致性
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
 * 获取缓存的配置
 */
let cachedConfig: EnvConfig | null = null

export function getConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = loadEnvConfig()
  }
  return cachedConfig
}

/**
 * 检查是否已配置 Supabase
 */
export function isSupabaseConfigured(): boolean {
  const config = getConfig()
  return !!(config.supabaseUrl && config.supabaseAnonKey)
}

/**
 * 验证文件上传
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const config = getConfig()

  // 检查文件大小
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > config.maxFileSize) {
    return {
      valid: false,
      error: `文件大小不能超过 ${config.maxFileSize}MB`,
    }
  }

  // 检查文件类型
  if (!config.allowedFileTypes.includes(file.type)) {
    return {
      valid: false,
      error: `不支持的文件类型: ${file.type}`,
    }
  }

  return { valid: true }
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证 URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
