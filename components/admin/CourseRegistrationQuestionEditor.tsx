'use client'
import type { CourseRegistrationQuestion } from '@/lib/course-registration-question'

export default function CourseRegistrationQuestionEditor({ value, onChange }: { value?: CourseRegistrationQuestion; onChange: (value: CourseRegistrationQuestion) => void }) {
  const question = value ?? { enabled: false, title: '', options: [], required: true }
  return <section className="col-span-full rounded-xl border border-black/10 bg-white p-4">
    <h4 className="font-bold">報名自訂下拉題</h4>
    <p className="mt-2 text-sm text-apple-gray-600">顯示於本課程「匯款與發票」步驟的備註上方。儲存並發布課程後生效；歷史回答保留原題目與答案。</p>
    <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={question.enabled} onChange={e => onChange({ ...question, enabled: e.target.checked })} />啟用報名下拉題</label>
    {question.enabled ? <div className="mt-4 grid gap-4">
      <label className="grid gap-2 text-sm font-bold">題目<input className="apple-input" maxLength={200} value={question.title} onChange={e => onChange({ ...question, title: e.target.value })} placeholder="請填寫給學員看的問題" /></label>
      <label className="grid gap-2 text-sm font-bold">選項（每行一個，最多30個）<textarea className="apple-input min-h-32" value={question.options.join('\n')} onChange={e => onChange({ ...question, options: e.target.value.split('\n') })} placeholder={'選項一\n選項二'} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={question.required} onChange={e => onChange({ ...question, required: e.target.checked })} />必填</label>
      <label className="grid gap-2 text-sm font-bold">學員畫面預覽：{question.title || '尚未設定題目'}<select className="apple-input" defaultValue=""><option value="">請選擇</option>{question.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}</select></label>
    </div> : null}
  </section>
}
