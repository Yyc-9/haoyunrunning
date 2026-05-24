# 课程详情页使用指南与测试清单

## 🚀 快速开始

### 1. 启动开发服务器
```bash
cd /Users/yangyichen/Desktop/好运网站
npm run dev
```

服务器启动后访问：
- **课程列表页**: `http://localhost:3000/courses`
- **课程详情页示例**: `http://localhost:3000/courses/zhou-yi-zhu-bei-ye-pao-ban`

### 2. 访问课程详情页的几种方式

#### 方法 A：从课程列表页点击
1. 访问 `http://localhost:3000/courses`
2. 在课程表中点击任何课程名称
3. 会跳转到对应的详情页

#### 方法 B：直接访问 URL
- 周一竹北夜跑班: `/courses/zhou-yi-zhu-bei-ye-pao-ban`
- 周三台北夜跑班: `/courses/zhou-san-tai-bei-ye-pao-ban`
- 周二台北 PB 班: `/courses/zhou-er-tai-bei-pb-ban`
- 周三新竹早鳥班: `/courses/zhou-san-xin-zhu-zao-niao-ban`
- 周三竹北夜跑班: `/courses/zhou-san-zhu-bei-ye-pao-ban`
- 周四竹市夜跑班: `/courses/zhou-si-zhu-shi-ye-pao-ban`
- 周四竹南初階班: `/courses/zhou-si-zhu-nan-chu-jie-ban`
- 周六台北早鳥班: `/courses/zhou-liu-tai-bei-zao-niao-ban`

## ✅ 功能测试清单

### 页面布局测试
- [ ] 英雄区域显示课程名称、标语和标签
- [ ] 核心信息区显示 6 个信息卡片
- [ ] 训练内容区显示 6 个训练项目卡片
- [ ] 好处区域显示 6 个 CheckList 项
- [ ] 教练卡片显示灰色头像占位框（Users 图标）
- [ ] 适合/不适合人群显示两个并排卡片
- [ ] 报名流程显示 5 个步骤
- [ ] FAQ 显示 5 个折叠项
- [ ] 右侧 Sticky 卡片显示快速总览

### 响应式设计测试
**手机端 (< 768px)**
- [ ] Hero 区域纵向布局
- [ ] 标签显示为一行（自动换行）
- [ ] Instagram 按钮显示在标签下方
- [ ] 信息卡片网格改为 1 列或 2 列
- [ ] 训练内容卡片为 1 列
- [ ] 适合/不适合卡片纵向堆叠
- [ ] 右侧侧栏移到下方

**平板端 (768px - 1024px)**
- [ ] 信息卡片网格显示为 2 列或 3 列
- [ ] 训练内容卡片显示为 2 列
- [ ] 右侧侧栏开始显示

**桌面端 (> 1024px)**
- [ ] 左侧主内容 + 右侧 sticky 侧栏布局
- [ ] 右侧 sticky 卡片跟随滚动
- [ ] 所有卡片都正常显示

### 多语言测试
1. **繁体中文 (zh-TW)**
   - [ ] 点击语言切换器选择「繁」
   - [ ] 所有 UI 文案切换为繁体
   - [ ] 课程信息、教练介绍等保持原样
   - [ ] 报名步骤和 FAQ 的文案为繁体

2. **简体中文 (zh-CN)**
   - [ ] 点击语言切换器选择「简」
   - [ ] 所有 UI 文案切换为简体
   - [ ] 保持一致性

3. **英文 (en)**
   - [ ] 点击语言切换器选择「EN」
   - [ ] 所有 UI 文案切换为英文
   - [ ] 课程名称保持中文（原始数据）
   - [ ] 教练信息保持中文（原始数据）

### 交互测试
- [ ] 点击"返回课程日程"按钮回到课程列表
- [ ] 点击 Instagram 咨询按钮打开新标签页
- [ ] FAQ 项可以展开/收起
- [ ] 展开 FAQ 时 ChevronDown 图标旋转
- [ ] 所有外链都可点击

### 占位图测试
- [ ] 教练卡片显示灰色头像框
- [ ] 头像框中显示 Users 图标
- [ ] 下方显示「教练照片」和「(后续补充)」文字

### 数据正确性测试
对每个课程，验证以下信息：
- [ ] 课程名称正确
- [ ] 城市/地点正确
- [ ] 星期几正确
- [ ] 课程周期正确
- [ ] 训练内容与课程类型相符
- [ ] 教练信息与课程类型相符
- [ ] FAQ 内容完整

### 边界情况测试
- [ ] 访问不存在的 slug（如 `/courses/invalid-slug`）显示 404
- [ ] 所有链接都有适当的悬停效果
- [ ] 没有控制台错误
- [ ] 加载速度正常

## 📝 修改教练照片的步骤（后续）

1. **上传照片**
   - 将教练照片上传到 Cloudinary 或其他图片 CDN
   - 获取照片 URL

2. **更新数据**
   在 `lib/goodluck-data.ts` 的 `getDefaultCoach()` 函数中添加 `photo` 字段：
   ```typescript
   return {
     name: '張育豪 教練',
     role: '本課程教練',
     bio: '...',
     specialties: [...],
     style: '...',
     achievements: [...],
     photo: 'https://cdn.example.com/coach.jpg'  // 新增
   }
   ```

3. **更新 CoachCard 组件**
   在 `components/CoachCard.tsx` 中：
   ```typescript
   import Image from 'next/image'
   
   // 替换占位区域
   {coach.photo ? (
     <Image 
       src={coach.photo} 
       alt={coach.name}
       width={200}
       height={200}
       className="rounded-lg object-cover"
     />
   ) : (
     // 保留占位图
   )}
   ```

## 🔧 常见问题

### Q: 为什么教练照片显示为灰色框？
A: 这是为了让你先完成页面结构，后续可以轻松替换为真实照片。占位图使用 Users 图标，易于识别。

### Q: 如何修改课程数据（训练内容、好处等）？
A: 编辑 `lib/goodluck-data.ts` 中的 `courseGroups` 数组或 `getDefaultTrainingItems()` 等函数。

### Q: 如何添加新的课程？
A: 在 `courseGroups` 中添加新的 course 对象即可。Slug 会自动生成。

### Q: 如何修改 FAQ 内容？
A: 编辑 `getDefaultFaq()` 函数或在课程对象中添加 `faq` 字段。

### Q: Instagram 链接如何修改？
A: 编辑课程对象中的 `instagramUrl` 字段或 `getDefaultCoach()` 中的 URL。

## 📊 代码统计

- **新增文件**: 6 个（组件）
- **修改文件**: 4 个（数据、字典、页面、context）
- **总行数**: 约 1,500+ 行代码
- **组件数**: 6 个
- **支持语言**: 3 种
- **响应式断点**: 3 个（mobile、tablet、desktop）

## 🎯 下一步计划

1. [ ] 上传真实教练照片
2. [ ] 从数据库动态加载课程数据（Supabase）
3. [ ] 添加内部报名表单
4. [ ] 集成支付系统
5. [ ] 添加学员评价组件
6. [ ] SEO 优化

## 📞 支持

如有问题或需要进一步修改，请参考以下文件：
- 数据结构: `lib/goodluck-data.ts`
- 多语言文案: `lib/dictionary.ts`
- 详情页页面: `app/courses/[slug]/page.tsx`
- 各组件文件在 `components/` 目录下

所有组件都有完整的 TypeScript 类型定义和注释，易于理解和修改。
