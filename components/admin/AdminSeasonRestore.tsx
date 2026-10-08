'use client'
import {useRef,useState} from 'react'
import {useLanguage} from '@/app/language-context'
import type {CourseSeason} from '@/lib/course-seasons'
export default function AdminSeasonRestore({seasons,runAction}:{seasons:CourseSeason[];runAction:(id:string,action:Record<string,unknown>)=>Promise<boolean>}) {
 const {language}=useLanguage();const en=language==='en'
 const [seasonId,setSeasonId]=useState('');const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const saving=useRef(false)
 const archived=seasons.filter(season=>season.status==='archived')
 if(!archived.length)return null
 async function restore(){
  if(saving.current||!seasonId||!reason.trim())return
  saving.current=true;setBusy(true);setError('')
  try{if(await runAction(`restore-${seasonId}`,{action:'restore_course_season',seasonId,reason:reason.trim()})){setSeasonId('');setReason('')}else setError(en?'Restore failed. Check the error and try again.':'解除封存未完成，請確認錯誤後重試。')}
  catch{setError(en?'Restore failed. Try again.':'解除封存失敗，請重試。')}
  finally{saving.current=false;setBusy(false)}
 }
 return <section className="mb-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-bold">{en?'Restore an archived season':'解除季度封存'}</h3><p className="text-sm leading-6">{en?'Restore to Completed to correct historical records. Enrollment publication and automatic sync stay off until separately enabled.':'恢復為「已結束」後可修正歷史資料。招生發布與自動同步不會隨此操作啟用，須另行設定。'}</p><fieldset disabled={busy} className="grid gap-3"><label className="grid gap-2 text-sm font-bold">{en?'Archived season':'已封存季度'}<select className="apple-input bg-white" value={seasonId} onChange={event=>setSeasonId(event.target.value)}><option value="">{en?'Select a season':'請選擇季度'}</option>{archived.map(season=><option key={season.id} value={season.id}>{season.name}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">{en?'Reason for restoring':'解除封存原因'}<textarea className="apple-input bg-white" maxLength={800} value={reason} onChange={event=>setReason(event.target.value)}/></label><button type="button" className="apple-button-primary" disabled={!seasonId||!reason.trim()} onClick={()=>void restore()}>{en?'Confirm restore to Completed':'確認恢復為已結束'}</button></fieldset>{error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}</section>
}
