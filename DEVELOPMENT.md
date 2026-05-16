# 开发指南

## 项目最近改进

### ✅ 已完成的改进

#### 1. 修复关键构建问题
- 添加了缺失的 `'use client'` 指令到 `/shop` 页面
- 修复了 Framer Motion 动画属性导致的服务端渲染问题
- 修复了所有构建错误，项目现已成功构建

#### 2. 添加错误处理页面
- `/app/error.tsx` - 全局错误边界处理
- `/app/not-found.tsx` - 404 页面处理
- 开发环境下显示详细错误信息

#### 3. 全局状态管理
- 创建了 `AuthProvider` Context 用于认证状态管理
- 实现了 `useAuth` hook 便于在组件中使用
- 集中管理用户登录、注册、注销等操作

#### 4. 表单验证系统
- 创建了 `lib/validation.ts` 提供统一的表单验证
- 支持邮箱、密码、电话号码、姓名等字段验证
- 返回结构化的验证错误信息

#### 5. API 客户端
- 创建了 `lib/api-client.ts` 提供统一的 API 请求接口
- 支持 GET、POST、PUT、DELETE 操作
- 统一的错误处理和响应格式

#### 6. 组件更新
- 更新 Navigation 组件使用新的 Auth Context
- 移除硬编码的登录状态，使用真实的认证状态

## 项目结构

```
好运网站/
├── app/
│   ├── layout.tsx              # 根布局，包含 AuthProvider
│   ├── page.tsx                # 首页
│   ├── error.tsx              # 错误处理页面
│   ├── not-found.tsx          # 404 页面
│   ├── providers.tsx          # 全局 Provider（Auth）
│   ├── shop/
│   │   └── page.tsx           # 商店页面（修复后）
│   ├── globals.css            # 全局样式
│   └── dashboard/             # 教练看板（可选）
├── components/
│   ├── Navigation.tsx         # 导航栏（已更新）
│   ├── AuthModal.tsx          # 认证模态框
│   ├── HeroSection.tsx        # 首页英雄区
│   ├── TrainingLogPreview.tsx # 训练日志
│   └── ...                    # 其他组件
├── lib/
│   ├── validation.ts          # 表单验证
│   ├── api-client.ts          # API 客户端
│   └── supabase.ts            # Supabase 配置（将来使用）
└── public/                    # 静态资源
```

## 核心模块使用指南

### 使用认证系统

```typescript
'use client'

import { useAuth } from '@/app/providers'

export default function MyComponent() {
  const { user, isLoggedIn, login, logout } = useAuth()

  return (
    <div>
      {isLoggedIn ? (
        <>
          <p>欢迎 {user?.name}</p>
          <button onClick={logout}>退出</button>
        </>
      ) : (
        <p>请先登录</p>
      )}
    </div>
  )
}
```

### 表单验证

```typescript
import { validateLoginForm, validateRegisterForm } from '@/lib/validation'

const loginData = { email: 'user@example.com', password: 'password123' }
const errors = validateLoginForm(loginData)

if (errors.length > 0) {
  console.error('验证失败:', errors)
}
```

### API 请求

```typescript
import { apiClient } from '@/lib/api-client'

// GET 请求
const response = await apiClient.get<UserData>('/api/user')

// POST 请求
const result = await apiClient.post<LoginResponse>('/api/login', {
  email: 'user@example.com',
  password: 'password123'
})
```

## 未来改进方向

### 优先级 1: 核心功能
- [ ] 连接 Supabase 认证
- [ ] 实现真实的数据库操作
- [ ] 完成训练日志功能
- [ ] 实现购物车功能

### 优先级 2: 用户体验
- [ ] 增强表单反馈
- [ ] 添加加载状态
- [ ] 优化移动端体验
- [ ] 添加通知系统

### 优先级 3: 性能优化
- [ ] 使用 Next.js Image 优化图片
- [ ] 实现代码分割
- [ ] 优化 CSS 文件大小
- [ ] 添加性能监测

## 开发工作流

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

### 检查 TypeScript 错误

```bash
npx tsc --noEmit
```

## 注意事项

1. **客户端组件** - 使用 `'use client'` 指令标记需要交互的组件
2. **服务端组件** - 不标记为 `'use client'` 的组件默认在服务端运行
3. **状态管理** - 使用 `useAuth` hook 访问全局认证状态
4. **表单验证** - 在提交前使用验证工具进行客户端验证
5. **API 请求** - 使用 `apiClient` 进行统一的请求管理

## 常见问题

### Q: 如何添加新的全局状态?
A: 在 `app/providers.tsx` 中创建新的 Context，类似 AuthProvider 的实现。

### Q: 如何集成后端 API?
A: 
1. 在 `.env.local` 中配置 API 地址
2. 在 `lib/api-client.ts` 中更新 baseUrl
3. 在各个 Context 中替换模拟实现为真实 API 调用

### Q: 如何添加新的验证规则?
A: 在 `lib/validation.ts` 中添加新的验证函数。

## 更新日志

### v0.2.0 (2026-05-15)
- ✅ 修复构建错误
- ✅ 添加错误处理页面
- ✅ 实现全局状态管理
- ✅ 添加表单验证系统
- ✅ 创建 API 客户端工具

### v0.1.0 (初始版本)
- ✅ 完整的前端界面
- ✅ Apple 设计风格
- ✅ 响应式布局
- ✅ 动画效果
