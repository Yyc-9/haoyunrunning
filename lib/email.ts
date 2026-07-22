import 'server-only'

type EnrollmentApprovedEmailInput = {
  to: string
  studentName: string
  courseName: string
}

type TransferReminderEmailInput = {
  to: string
  studentName: string
  courseName: string
  courseSlug: string
}

type EmailResult = {
  sent: boolean
  skipped?: boolean
  message: string
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character
  )
}

async function sendEmail(input: { to: string; subject: string; text: string; html: string; skipLog: string; skipMessage: string; failMessage: string; successMessage: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ENROLLMENT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    console.info(input.skipLog)

    return {
      sent: false,
      skipped: true,
      message: input.skipMessage,
    }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  })

  if (!response.ok) {
    console.warn('[email] Email send failed.', { status: response.status })

    return {
      sent: false,
      message: input.failMessage,
    }
  }

  return {
    sent: true,
    message: input.successMessage,
  }
}

export async function sendEnrollmentApprovedEmail(input: EnrollmentApprovedEmailInput): Promise<EmailResult> {
  const subject = '好運跑班銀行入帳已確認'
  const studentName = input.studentName || '同學'
  const courseName = input.courseName || '已報名課程'
  const safeStudentName = escapeHtml(studentName)
  const safeCourseName = escapeHtml(courseName)

  return sendEmail({
    to: input.to,
    subject,
    text: `${studentName}你好：\n\n你的 ${courseName} 匯款已與銀行入帳紀錄核對完成，課程報名已確認。\n\n後續集合時間、地點與課程通知將由好運跑班另行聯絡。\n\n好運跑班`,
    html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#111827;">
          <h2>銀行入帳已確認</h2>
          <p>${safeStudentName}你好：</p>
          <p>你的 <strong>${safeCourseName}</strong> 匯款已與銀行入帳紀錄核對完成，課程報名已確認。</p>
          <p>後續集合時間、地點與課程通知將由好運跑班另行聯絡。</p>
          <p>好運跑班</p>
        </div>
      `,
    skipLog: '[email] Enrollment approved email skipped: RESEND_API_KEY or sender env is missing.',
    skipMessage: '郵件服務尚未設定，已完成對帳但未發送郵件。',
    failMessage: '對帳已完成，但郵件發送失敗，請稍後檢查郵件服務設定。',
    successMessage: '對帳已完成，並已發送報名確認郵件。',
  })
}

export async function sendTransferReminderEmail(input: TransferReminderEmailInput): Promise<EmailResult> {
  const studentName = input.studentName || '同學'
  const courseName = input.courseName || '已報名課程'
  const safeStudentName = escapeHtml(studentName)
  const safeCourseName = escapeHtml(courseName)
  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nurturerunningteam.com').replace(/\/$/, '')
  const statusUrl = input.courseSlug
    ? `${siteOrigin}/courses/${encodeURIComponent(input.courseSlug)}/register`
    : `${siteOrigin}/payment`

  return sendEmail({
    to: input.to,
    subject: '提醒填寫銀行帳號後五碼',
    text: `${studentName}你好：\n\n你已完成 ${courseName} 課程報名，但目前尚未提交匯款帳號後五碼。\n\n完成匯款後，請回到報名與匯款狀態頁回報後五碼，我們會依銀行入帳紀錄人工核對。\n\n回報頁：${statusUrl}\n\n好運跑班`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#111827;">
        <h2>提醒填寫銀行帳號後五碼</h2>
        <p>${safeStudentName}你好：</p>
        <p>你已完成 <strong>${safeCourseName}</strong> 課程報名，但目前尚未提交匯款帳號後五碼。</p>
        <p>完成匯款後，請回到報名與匯款狀態頁回報後五碼，我們會依銀行入帳紀錄人工核對。</p>
        <p><a href="${statusUrl}">回報匯款後五碼</a></p>
        <p>好運跑班</p>
      </div>
    `,
    skipLog: '[email] Transfer reminder email skipped: RESEND_API_KEY or sender env is missing.',
    skipMessage: '郵件服務尚未設定，提醒任務已跳過發送。',
    failMessage: '提醒郵件發送失敗，請稍後檢查郵件服務設定。',
    successMessage: '提醒郵件已發送。',
  })
}
