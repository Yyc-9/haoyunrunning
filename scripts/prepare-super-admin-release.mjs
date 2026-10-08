// Builds an isolated, reviewable source snapshot. Never deploys, changes Git,
// connects to a database, or copies .env files and private local artifacts.
import { execFileSync } from 'node:child_process'
import { readFile,writeFile,mkdir,mkdtemp,copyFile,symlink } from 'node:fs/promises'
import { join,dirname,resolve } from 'node:path'
import { createHash } from 'node:crypto'

const root=resolve(process.cwd())
const manifest=JSON.parse(await readFile(join(root,'docs/super-admin-release-manifest.json'),'utf8'))
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
const base=execFileSync('git',['rev-parse',manifest.baseCommit],{cwd:root,encoding:'utf8'}).trim()
if(head!==base)throw Error('Base commit changed. Review the release manifest before preparing a new snapshot.')
const destination=await mkdtemp('/private/tmp/goodluck-super-admin-release-')
const archive=execFileSync('git',['archive',base],{cwd:root,maxBuffer:300*1024*1024})
execFileSync('tar',['-x','-C',destination],{input:archive,maxBuffer:300*1024*1024})
for(const file of manifest.files){
 if(file.startsWith('/')||file.split('/').includes('..')||file.startsWith('.env'))throw Error('Unsafe release path')
 await mkdir(dirname(join(destination,file)),{recursive:true});await copyFile(join(root,file),join(destination,file))
}
async function remove(file,text){
 const path=join(destination,file);const content=await readFile(path,'utf8')
 if(content.split(text).length!==2)throw Error(`Shared-file edit changed; manually review ${file}`)
 await writeFile(path,content.replace(text,''))
}
await remove('app/api/admin/route.ts',"import { normalizeCoachGeofence } from '@/lib/coach-geofence'\n")
await remove('app/api/admin/route.ts',`    const rawFence = body.value && typeof body.value === 'object'
      ? (body.value as Record<string, unknown>).coachGeofence : undefined
    if (rawFence != null && !normalizeCoachGeofence(rawFence)) {
      return json({ error: '請填寫有效的集合點經緯度，以及 50 至 1000 公尺的簽到範圍。' }, { status: 400 })
    }
`)
for(const text of ["import type { CoachGeofence } from '@/lib/coach-geofence'\n",'  coachGeofence: CoachGeofence | null\n','  coachGeofence?: CoachGeofence | null\n','          coachGeofence: override?.coachGeofence ?? null,\n','        coachGeofence: course.coachGeofence,\n'])await remove('lib/coach-session-duty.ts',text)
const gpsKeys=['請填寫有效的集合點經緯度，以及 50 至 1000 公尺的簽到範圍。','教練 GPS 到場簽到','啟用集合點範圍限制','緯度','經度','範圍（公尺）','集合點緯度','集合點經度','GPS 簽到範圍','請填入確認過的集合點經緯度。定位不準或未允許定位時，教練可重試；管理員仍可填寫原因補登。']
const copyPath=join(destination,'lib/english-admin-action-copy.ts')
const lines=(await readFile(copyPath,'utf8')).split('\n')
for(const key of gpsKeys)if(lines.filter(line=>line.startsWith(`  '${key}':`)).length!==1)throw Error('GPS copy changed; manually review shared translations')
await writeFile(copyPath,lines.filter(line=>!gpsKeys.some(key=>line.startsWith(`  '${key}':`))).join('\n'))
// Dependencies are reused only for local checks; never include them in the source artifact.
await symlink(join(root,'node_modules'),join(destination,'node_modules'),'dir')
const hashes={}
for(const file of manifest.files)hashes[file]=createHash('sha256').update(await readFile(join(destination,file))).digest('hex')
await writeFile(join(destination,'release-evidence.json'),JSON.stringify({base,source:root,preparedAt:new Date().toISOString(),hashes},null,2)+'\n')
console.log(JSON.stringify({destination,base,files:manifest.files.length,migrations:manifest.migrationOrder},null,2))
