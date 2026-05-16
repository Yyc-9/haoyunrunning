// 模拟数据生成器
export interface MockUser {
  id: string
  name: string
  email: string
  phone: string
  gender: 'male' | 'female' | 'other'
  pb: string
  avatar: string
  joinDate: string
}

export interface MockTrainingLog {
  id: string
  userId: string
  date: string
  distance: number
  pace: string
  heartRate: number
  rpe: number
  comment: string
  completed: boolean
}

export interface MockProduct {
  id: string
  name: string
  category: string
  price: number
  originalPrice: number
  image: string
  rating: number
  reviews: number
  stock: number
}

// 模拟用户列表
export function generateMockUsers(count: number = 10): MockUser[] {
  const names = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十', '刘11', '陈12']
  const users: MockUser[] = []

  for (let i = 0; i < Math.min(count, names.length); i++) {
    users.push({
      id: `user_${i + 1}`,
      name: names[i],
      email: `${names[i]}@example.com`,
      phone: `138${String(i).padStart(8, '0')}`,
      gender: i % 3 === 0 ? 'female' : i % 3 === 1 ? 'male' : 'other',
      pb: `${40 + i * 2}:${30 - i * 2}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${names[i]}`,
      joinDate: new Date(2025, 0, i + 1).toISOString(),
    })
  }

  return users
}

// 模拟训练日志
export function generateMockTrainingLogs(userId: string, count: number = 7): MockTrainingLog[] {
  const logs: MockTrainingLog[] = []
  const today = new Date()

  for (let i = 0; i < count; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    logs.push({
      id: `log_${userId}_${i}`,
      userId,
      date: date.toISOString().split('T')[0],
      distance: 5 + Math.random() * 5,
      pace: `${5 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      heartRate: 140 + Math.floor(Math.random() * 40),
      rpe: Math.floor(Math.random() * 10) + 1,
      comment: ['感觉不错', '有点累', '状态一般', '今天天气真好', '坚持训练'][Math.floor(Math.random() * 5)],
      completed: Math.random() > 0.2,
    })
  }

  return logs
}

// 模拟商品列表
export function generateMockProducts(count: number = 12): MockProduct[] {
  const products = [
    { name: '专业跑步鞋', category: '跑步鞋', price: 899, originalPrice: 1299 },
    { name: '心率监测手环', category: '智能设备', price: 499, originalPrice: 699 },
    { name: '运动压缩袜', category: '服装配件', price: 199, originalPrice: 299 },
    { name: '跑步水袋背包', category: '背包', price: 399, originalPrice: 599 },
    { name: 'GPS 运动手表', category: '智能设备', price: 1499, originalPrice: 2199 },
    { name: '能量补给套餐', category: '营养品', price: 299, originalPrice: 499 },
    { name: '运动T恤', category: '服装', price: 129, originalPrice: 199 },
    { name: '运动短裤', category: '服装', price: 159, originalPrice: 249 },
    { name: '防晒喷雾', category: '护理', price: 89, originalPrice: 139 },
    { name: '跑步腰包', category: '背包', price: 49, originalPrice: 79 },
    { name: '运动袜 (3双)', category: '服装配件', price: 79, originalPrice: 129 },
    { name: '能量棒 (12根)', category: '营养品', price: 149, originalPrice: 229 },
  ]

  return products.slice(0, Math.min(count, products.length)).map((p, idx) => ({
    id: `product_${idx}`,
    ...p,
    image: `https://via.placeholder.com/200x200?text=${p.name}`,
    rating: 4 + Math.random() * 0.9,
    reviews: Math.floor(Math.random() * 200) + 20,
    stock: Math.floor(Math.random() * 100) + 1,
  }))
}

// 模拟课程
export interface MockCourse {
  id: string
  name: string
  description: string
  duration: number // 周数
  level: 'beginner' | 'intermediate' | 'advanced'
  price: number
  image: string
  students: number
  rating: number
}

export function generateMockCourses(count: number = 6): MockCourse[] {
  const courses = [
    {
      name: '5K 快速入门',
      description: '为初学者设计的 5 公里跑步计划',
      duration: 4,
      level: 'beginner' as const,
      price: 199,
    },
    {
      name: '半马训练营',
      description: '专业的半马训练方案',
      duration: 8,
      level: 'intermediate' as const,
      price: 399,
    },
    {
      name: '全马冲刺',
      description: '完整的全马训练计划',
      duration: 16,
      level: 'advanced' as const,
      price: 799,
    },
    {
      name: '速度训练',
      description: '提升跑步速度的高效训练',
      duration: 6,
      level: 'intermediate' as const,
      price: 299,
    },
    {
      name: '耐力基础',
      description: '建立长跑耐力的基础课程',
      duration: 8,
      level: 'beginner' as const,
      price: 249,
    },
    {
      name: '恢复与防伤',
      description: '科学的恢复方法和伤病预防',
      duration: 4,
      level: 'intermediate' as const,
      price: 299,
    },
  ]

  return courses.slice(0, Math.min(count, courses.length)).map((c, idx) => ({
    id: `course_${idx}`,
    ...c,
    image: `https://via.placeholder.com/300x200?text=${c.name}`,
    students: Math.floor(Math.random() * 500) + 50,
    rating: 4 + Math.random() * 0.95,
  }))
}

// 模拟教练
export interface MockCoach {
  id: string
  name: string
  title: string
  bio: string
  image: string
  experience: number // 年
  students: number
  rating: number
}

export function generateMockCoaches(count: number = 4): MockCoach[] {
  const coaches = [
    {
      name: '王教练',
      title: '认证马拉松教练',
      bio: '拥有 10 年跑步训练经验，曾帮助 100+ 学员完成马拉松',
      experience: 10,
    },
    {
      name: '李教练',
      title: '速度训练专家',
      bio: '专注于速度和间歇训练，多名学员突破个人纪录',
      experience: 8,
    },
    {
      name: '张教练',
      title: '伤病康复师',
      bio: '运动医学背景，专业处理跑步相关伤病',
      experience: 12,
    },
    {
      name: '陈教练',
      title: '营养与体能教练',
      bio: '集训练、营养、体能于一身的全能教练',
      experience: 7,
    },
  ]

  return coaches.slice(0, Math.min(count, coaches.length)).map((c, idx) => ({
    id: `coach_${idx}`,
    ...c,
    image: `https://api.dicebear.com/7.x/avataaars/svg?seed=coach_${idx}`,
    students: Math.floor(Math.random() * 100) + 10,
    rating: 4.5 + Math.random() * 0.5,
  }))
}

// 统一导出接口
export const mockData = {
  generateMockUsers,
  generateMockTrainingLogs,
  generateMockProducts,
  generateMockCourses,
  generateMockCoaches,
}
