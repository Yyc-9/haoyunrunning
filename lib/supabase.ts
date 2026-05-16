// Supabase配置示例文件
// 实际使用时替换以下环境变量

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
}

// 表名定义
export const DatabaseTables = {
  USERS: 'users',
  TRAINING_LOGS: 'training_logs',
  COACH_FEEDBACK: 'coach_feedback',
  WORKOUT_PLANS: 'workout_plans',
  SUBSCRIPTIONS: 'subscriptions',
} as const

// 认证服务示例
export const AuthService = {
  async signUp(email: string, password: string, userData: any) {
    // Supabase认证示例
    // const { data, error } = await supabase.auth.signUp({
    //   email,
    //   password,
    //   options: {
    //     data: userData,
    //   },
    // })
    // return { data, error }
  },

  async signIn(email: string, password: string) {
    // const { data, error } = await supabase.auth.signInWithPassword({
    //   email,
    //   password,
    // })
    // return { data, error }
  },

  async signOut() {
    // const { error } = await supabase.auth.signOut()
    // return { error }
  },

  async getCurrentUser() {
    // const { data: { user }, error } = await supabase.auth.getUser()
    // return { user, error }
  },
}

// 训练日志服务示例
export const TrainingLogService = {
  async submitTrainingLog(userId: string, logData: any) {
    // const { data, error } = await supabase
    //   .from(DatabaseTables.TRAINING_LOGS)
    //   .insert([{
    //     user_id: userId,
    //     ...logData,
    //     created_at: new Date().toISOString(),
    //   }])
    // return { data, error }
  },

  async getTrainingLogs(userId: string, limit = 50) {
    // const { data, error } = await supabase
    //   .from(DatabaseTables.TRAINING_LOGS)
    //   .select('*')
    //   .eq('user_id', userId)
    //   .order('created_at', { ascending: false })
    //   .limit(limit)
    // return { data, error }
  },

  async getTodayWorkout(userId: string) {
    const today = new Date().toISOString().split('T')[0]
    // const { data, error } = await supabase
    //   .from(DatabaseTables.WORKOUT_PLANS)
    //   .select('*')
    //   .eq('user_id', userId)
    //   .eq('scheduled_date', today)
    //   .single()
    // return { data, error }
  },
}

// 教练服务示例
export const CoachService = {
  async getAllStudents(limit = 100) {
    // const { data, error } = await supabase
    //   .from(DatabaseTables.USERS)
    //   .select('*')
    //   .eq('role', 'student')
    //   .order('created_at', { ascending: false })
    //   .limit(limit)
    // return { data, error }
  },

  async getPendingFeedback(limit = 20) {
    // const { data, error } = await supabase
    //   .from(DatabaseTables.TRAINING_LOGS)
    //   .select(`
    //     *,
    //     users (name, avatar_url)
    //   `)
    //   .is('coach_reviewed', false)
    //   .order('created_at', { ascending: false })
    //   .limit(limit)
    // return { data, error }
  },

  async submitCoachFeedback(logId: string, coachId: string, content: string) {
    // const { data, error } = await supabase
    //   .from(DatabaseTables.COACH_FEEDBACK)
    //   .insert([{
    //     log_id: logId,
    //     coach_id: coachId,
    //     content,
    //     created_at: new Date().toISOString(),
    //   }])
    // return { data, error }
  },
}

// 文件上传服务示例
export const StorageService = {
  async uploadTrainingImage(userId: string, file: File, logId: string) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${logId}/${Date.now()}.${fileExt}`

    // const { data, error } = await supabase.storage
    //   .from('training-images')
    //   .upload(fileName, file, {
    //     cacheControl: '3600',
    //     upsert: false,
    //   })
    // return { data, error }
  },

  async getImageUrl(filePath: string) {
    // Supabase图片URL生成示例
    // const { data } = supabase.storage
    //   .from('training-images')
    //   .getPublicUrl(filePath)
    // return data.publicUrl
  },
}

// 类型定义
export interface TrainingLog {
  id: string
  user_id: string
  workout_type: string
  distance: number
  pace: string
  heart_rate: number
  rpe: number
  comment: string
  attachments: string[]
  created_at: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  gender: string
  pb: string
  avatar_url: string
  role: 'student' | 'coach' | 'admin'
  created_at: string
}

export interface CoachFeedback {
  id: string
  log_id: string
  coach_id: string
  content: string
  created_at: string
}

// 订阅监听示例（实时更新）
export const setupRealtimeSubscriptions = () => {
  // 监听训练日志更新
  // const channel = supabase
  //   .channel('training-logs')
  //   .on(
  //     'postgres_changes',
  //     {
  //       event: 'INSERT',
  //       schema: 'public',
  //       table: DatabaseTables.TRAINING_LOGS,
  //     },
  //     (payload) => {
  //       console.log('New training log:', payload.new)
  //       // 更新UI状态
  //     }
  //   )
  //   .subscribe()
  // return channel
}

export default {
  supabaseConfig,
  DatabaseTables,
  AuthService,
  TrainingLogService,
  CoachService,
  StorageService,
  setupRealtimeSubscriptions,
}