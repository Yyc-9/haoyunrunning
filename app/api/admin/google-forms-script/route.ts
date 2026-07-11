import { createHmac } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin-auth'
import { allCourses } from '@/lib/goodluck-data'
import { getAuthedUser } from '@/lib/supabase-server'

function cleanText(value: unknown, maxLength = 200) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user || !(await getAdminProfile(user))) {
    return NextResponse.json({ error: '只有超級管理員可以取得表單串接程式。' }, { status: 403 })
  }

  const secret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET?.trim() ?? ''
  if (!secret) {
    return NextResponse.json({ error: 'Google 表單串接憑證尚未設定。' }, { status: 503 })
  }

  const body = (await request.json().catch(() => ({}))) as { courseSlug?: string }
  const courseSlug = cleanText(body.courseSlug, 120)
  const course = allCourses.find((item) => item.slug === courseSlug)
  if (!course) {
    return NextResponse.json({ error: '找不到這個課程。' }, { status: 404 })
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nurturerunningteam.com').replace(/\/$/, '')
  const webhookUrl = `${siteUrl}/api/integrations/google-forms`
  const returnUrl = `${siteUrl}/courses/${course.slug}/register?submitted=1`
  const courseSecret = createHmac('sha256', secret).update(course.slug).digest('hex')
  const config = JSON.stringify({ courseSlug: course.slug, webhookUrl, returnUrl, secret: courseSecret }, null, 2)

  const script = `const GOODLUCK = Object.freeze(${config});

function setupGoodLuckRegistrationSync() {
  const form = FormApp.getActiveForm();
  form.setCollectEmail(true);
  form.setConfirmationMessage(
    '報名資料已送出。請返回好運跑班查看待付款狀態：\\n' + GOODLUCK.returnUrl
  );

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'syncGoodLuckRegistration')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('syncGoodLuckRegistration')
    .forForm(form)
    .onFormSubmit()
    .create();

  form.getResponses().forEach((formResponse) => syncGoodLuckResponse(formResponse));
}

function syncGoodLuckRegistration(event) {
  syncGoodLuckResponse(event.response);
}

function syncGoodLuckResponse(formResponse) {
  const responses = {};

  formResponse.getItemResponses().forEach((itemResponse) => {
    const title = itemResponse.getItem().getTitle();
    const rawAnswer = itemResponse.getResponse();
    const answer = Array.isArray(rawAnswer) ? rawAnswer.join('、') : String(rawAnswer || '');
    responses[title] = responses[title] ? responses[title] + '、' + answer : answer;
  });

  const result = UrlFetchApp.fetch(GOODLUCK.webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goodluck-form-secret': GOODLUCK.secret },
    payload: JSON.stringify({
      courseSlug: GOODLUCK.courseSlug,
      responseId: formResponse.getId(),
      respondentEmail: formResponse.getRespondentEmail() || '',
      submittedAt: formResponse.getTimestamp().toISOString(),
      formTitle: FormApp.getActiveForm().getTitle(),
      responses: responses
    }),
    muteHttpExceptions: true
  });

  const status = result.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('好運網站同步失敗：HTTP ' + status + ' ' + result.getContentText());
  }
}
`

  return NextResponse.json({ script, returnUrl, webhookUrl })
}
