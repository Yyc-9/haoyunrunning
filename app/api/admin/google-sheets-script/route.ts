import { createHmac } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { q3RosterSheetCourses } from '@/lib/google-sheets-roster-sync'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

function cleanText(value: unknown, maxLength = 200) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user || !(await getAdminProfile(user))) {
    return NextResponse.json({ error: '只有超級管理員可以取得表格同步程式。' }, { status: 403 })
  }

  const secret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET?.trim() ?? ''
  if (!secret) {
    return NextResponse.json({ error: 'Google 表格同步憑證尚未設定。' }, { status: 503 })
  }

  const body = (await request.json().catch(() => ({}))) as { seasonId?: unknown }
  const seasonId = cleanText(body.seasonId, 80)
  const { data: source, error: sourceError } = await supabaseAdmin
    .from('course_season_sync_sources')
    .select('id, season_id, external_id, source_url, active')
    .eq('season_id', seasonId)
    .eq('provider', 'google_sheets')
    .maybeSingle()

  if (sourceError || !source || !source.active) {
    return NextResponse.json({ error: '這一季尚未連結 Google 表格。' }, { status: 404 })
  }

  const { data: season, error: seasonError } = await supabaseAdmin
    .from('course_seasons')
    .select('code, name')
    .eq('id', source.season_id)
    .single()
  if (seasonError || !season) {
    return NextResponse.json({ error: '找不到同步季度。' }, { status: 404 })
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nurturerunningteam.com').replace(/\/$/, '')
  const webhookUrl = `${siteUrl}/api/integrations/google-sheets`
  const syncSecret = createHmac('sha256', secret)
    .update(`google-sheets:${season.code}:${source.external_id}`)
    .digest('hex')
  const config = JSON.stringify({
    seasonCode: season.code,
    spreadsheetId: source.external_id,
    webhookUrl,
    secret: syncSecret,
    sheetNames: Object.keys(q3RosterSheetCourses),
  }, null, 2)

  const script = `const GOODLUCK_ROSTER = Object.freeze(${config});

function setupGoodLuckRosterSync() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (spreadsheet.getId() !== GOODLUCK_ROSTER.spreadsheetId) {
    throw new Error('請在已連結的 Q3 Google 表格中安裝這段程式。');
  }

  ScriptApp.getProjectTriggers()
    .filter((trigger) => [
      'syncGoodLuckRosterOnFormSubmit',
      'syncGoodLuckRosterOnSchedule'
    ].includes(trigger.getHandlerFunction()))
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('syncGoodLuckRosterOnFormSubmit')
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  ScriptApp.newTrigger('syncGoodLuckRosterOnSchedule')
    .timeBased()
    .everyMinutes(5)
    .create();

  syncGoodLuckRoster();
}

function syncGoodLuckRosterOnFormSubmit() {
  syncGoodLuckRoster();
}

function syncGoodLuckRosterOnSchedule() {
  syncGoodLuckRoster();
}

function syncGoodLuckRoster() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    const spreadsheet = SpreadsheetApp.openById(GOODLUCK_ROSTER.spreadsheetId);
    const sheets = GOODLUCK_ROSTER.sheetNames.map((name) => {
      const sheet = spreadsheet.getSheetByName(name);
      if (!sheet) return { name: name, rows: [] };

      const lastRow = sheet.getLastRow();
      const lastColumn = Math.min(sheet.getLastColumn(), 60);
      const values = lastRow && lastColumn
        ? sheet.getRange(1, 1, Math.min(lastRow, 250), lastColumn).getValues()
        : [];

      return {
        name: name,
        rows: values.map((row) => row.map((value) =>
          value instanceof Date ? value.toISOString() : String(value == null ? '' : value)
        ))
      };
    });

    const response = UrlFetchApp.fetch(GOODLUCK_ROSTER.webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goodluck-sheet-secret': GOODLUCK_ROSTER.secret },
      payload: JSON.stringify({
        seasonCode: GOODLUCK_ROSTER.seasonCode,
        spreadsheetId: GOODLUCK_ROSTER.spreadsheetId,
        sheets: sheets
      }),
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    if (status < 200 || status >= 300) {
      throw new Error('好運網站同步失敗：HTTP ' + status + ' ' + response.getContentText());
    }
  } finally {
    lock.releaseLock();
  }
}
`

  return NextResponse.json({
    script,
    spreadsheetUrl: source.source_url,
    spreadsheetId: source.external_id,
    webhookUrl,
    seasonName: season.name,
  })
}
