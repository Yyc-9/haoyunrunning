# 🚀 好運跑班 - 快速开始指南

这个项目是一个完整的前端应用，需要与后端服务（推荐使用 Supabase）配合使用才能发挥全部功能。

## 📋 前置要求

- Node.js 18 或更高版本
- npm 或 yarn
- 可选：Supabase 账户（用于完整功能）

## 🛠️ 安装步骤

### 1. 安装依赖
```bash
# 复制环境变量配置文件
cp .env.example .env.local

# 安装项目依赖
npm install
# 或者使用 yarn
yarn install
```

### 2. 配置环境变量
打开 `.env.local` 文件，配置以下变量：

```env
# Supabase 配置（必填，如需完整功能）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 网站配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. 启动开发服务器
```bash
npm run dev
# 或者
yarn dev
```

访问 http://localhost:3000 查看应用。

## 🚴 项目结构快速概览

```
components/
├── Navigation.tsx       # 顶部导航栏
├── AuthModal.tsx       # 认证弹窗
├── HeroSection.tsx     # 首页英雄区
├── FeaturesSection.tsx # 特色功能
├── CoursesSection.tsx  # 课程展示
├── TrainingLogPreview.tsx # 训练日志
├── TestimonialsSection.tsx # 学员评价
├── CtaSection.tsx      # 行动号召
├── Dashboard.tsx       # 教练看板
├── Toast.tsx          # 通知组件
├── Footer.tsx         # 页脚
└── ...
```

## 🎭 模拟功能使用指南

由于当前项目为纯前端实现，以下功能已配置为模拟模式：

### 用户认证
- 点击右上角"登录"按钮触发认证弹窗
- 可在弹窗中切换登录/注册模式
- 表单验证和UI交互完整实现
- **实际集成**：需要连接 Supabase Auth

### 训练日志提交
- 在首页训练日志部分提交训练反馈
- 包含距离、配速、心率、体感评分等字段
- 支持文件上传（UI已实现）
- 提交后显示毛玻璃质感的Toast通知
- **实际集成**：需要连接数据库存储

### 教练看板
- 查看学员列表和训练进度
- 查看待回复的训练反馈
- 给学员发送回复消息
- **实际集成**：需要真实的用户数据和权限系统

## 🔌 连接 Supabase（推荐）

### 1. 创建 Supabase 项目
1. 访问 https://supabase.com/ 并注册
2. 创建新项目
3. 在设置中获取项目URL和anon key

### 2. 数据库表结构
项目根目录的 `lib/supabase.ts` 文件中提供了完整的表结构建议：

```sql
-- 核心表结构
users (用户表)
training_logs (训练日志表)
coach_feedback (教练回复表)
workout_plans (训练计划表)
```

### 3. 启用认证功能
1. 在 Supabase 控制台启用 Email 认证
2. 配置重定向URL
3. 设置用户配置文件表

## 🔧 自定义配置

### 修改品牌颜色
编辑 `tailwind.config.ts` 文件：

```typescript
theme: {
  extend: {
    colors: {
      apple: {
        blue: '#你的蓝色',     // 主要按钮颜色
        orange: '#你的橙色',   // 次要按钮颜色
        gray: { ... }         // 灰色系
      }
    }
  }
}
```

### 添加页面路由
Next.js App Router 约定：
```bash
# 创建新页面
app/
├── courses/           # 课程页面
│   └── page.tsx
├── dashboard/         # 用户仪表板
│   └── page.tsx
└── training/          # 训练页面
    └── page.tsx
```

### 添加新组件
```typescript
// components/NewComponent.tsx
export default function NewComponent() {
  return (
    <div className="apple-card p-6">
      {/* 使用 Apple 设计语言 */}
    </div>
  )
}
```

## 📱 移动端适配

项目已全面适配移动端：
- 响应式断点（sm, md, lg）
- 触摸友好的按钮和输入框
- 移动优先的布局设计
- 滚动动画优化

## 🎨 设计规范遵循

### Apple 风格组件
```tsx
// 使用预设的 utility classes
<div className="apple-card">卡片</div>
<button className="apple-button-primary">主要按钮</button>
<button className="apple-button-secondary">次要按钮</button>
<button className="apple-button-outline">轮廓按钮</button>
<input className="apple-input" />
<range className="apple-slider" />
```

### 动画效果
```tsx
// 使用 Framer Motion
<motion.div 
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  交互元素
</motion.div>
```

## 🧪 测试和调试

### 开发服务器
```bash
# 启动开发服务器（带热重载）
npm run dev

# 构建并预览生产版本
npm run build
npm run start
```

### Lint 检查
```bash
npm run lint
```

### TypeScript 检查
```bash
npx tsc --noEmit
```

## 📦 生产部署

### Vercel（推荐）
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署到 Vercel
vercel
```

### 手动构建
```bash
# 生产环境构建
npm run build

# 启动生产服务器
npm start
```

## 🐛 常见问题

### 1. 缺少依赖
```bash
# 清除缓存并重新安装
rm -rf node_modules package-lock.json
npm install
```

### 2. 样式不生效
确保 CSS 文件正确导入：
```typescript
// app/layout.tsx
import './globals.css'
```

### 3. TypeScript 错误
```bash
# 检查 TypeScript 配置
npx tsc --noEmit --project .
```

### 4. 图片资源加载
- 将图片放在 `public/` 目录
- 使用 `<Image>` 组件优化
- 或链接外部图片URL

## 📞 技术支持

1. **前端问题**：检查控制台错误信息
2. **样式问题**：查看浏览器开发者工具
3. **路由问题**：确认 App Router 结构
4. **API 集成**：参考 Supabase 文档

## 🚀 下一步

1. ✅ 完成基础界面开发
2. 🔄 连接 Supabase 后端
3. 🔄 实现用户认证
4. 🔄 添加数据库存储
5. 🔄 部署到生产环境

---

**项目状态**：
- ✅ 完整的前端界面
- ✅ 苹果设计语言实现
- ✅ 响应式布局
- ✅ 交互动画效果
- 🔄 需要后端集成才能运作全部功能

**预计集成时间**：有经验的开发者为 2-4 小时可以完成所有后端连接。