import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const roots = ['app', 'components', 'lib']
const extensions = new Set(['.ts', '.tsx'])
const ignored = new Set([
  'app/language-context.tsx',
  'lib/dictionary.ts',
  'lib/traditional-chinese.ts',
])
const ignoredPrefixes = [
  'app/api/',
  'lib/bank-',
  'lib/google-',
]

const simplifiedPhrases = [
  '为什么', '一场比赛', '一个', '为了', '这些', '对应', '门槛', '训练', '经历',
  '浓缩', '记号', '比较', '看见', '曾经', '荣耀徽章', '全马', '半马', '波士顿',
  '献给', '牺牲', '执着', '勋章', '申请期间', '领发安排', '当期公告', '成绩核对',
  '申请资料', '单独购买', '已经取得', '课程', '学员', '教练', '团队', '网页',
  '后台', '账号', '账户', '资料库', '上传', '储存', '点击', '链接', '视频',
  '页面', '首页', '关于我们', '简体中文', '繁体中文', '体育场', '田径场',
  '运动场', '长距离', '手机', '截图', '旧生', '网银', '备注', '待对账',
  '已确认', '需处理', '右侧', '体验', '适中', '维持', '称呼',
]

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? listFiles(target) : [target]
  }))
  return files.flat()
}

const findings = []

for (const root of roots) {
  for (const file of await listFiles(root)) {
    const relative = file.split(path.sep).join('/')
    if (!extensions.has(path.extname(file))) continue
    if (ignored.has(relative) || ignoredPrefixes.some((prefix) => relative.startsWith(prefix))) continue

    const lines = (await readFile(file, 'utf8')).split(/\r?\n/)
    lines.forEach((line, index) => {
      const matches = simplifiedPhrases.filter((phrase) => line.includes(phrase))
      if (matches.length) findings.push(`${relative}:${index + 1}  ${[...new Set(matches)].join('、')}`)
    })
  }
}

if (findings.length) {
  console.error('偵測到可能出現在網站介面的簡體中文：')
  findings.forEach((finding) => console.error(`- ${finding}`))
  process.exit(1)
}

console.log('繁體中文檢查通過。')
