type EnrollmentApprovedEmailInput = {
  to: string
  studentName: string
  courseName: string
}

type TransferReminderEmailInput = {
  to: string
  studentName: string
  courseName: string
}

type EmailResult = {
  sent: boolean
  skipped?: boolean
  message: string
}

async function sendEmail(input: { to: string; subject: string; text: string; html: string; skipLog: string; skipMessage: string; failMessage: string; successMessage: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ENROLLMENT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    console.info(input.skipLog, { to: input.to })

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
    const detail = await response.text().catch(() => '')
    console.warn('[email] Email send failed.', { status: response.status, detail })

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
  const subject = '好運跑班課表已開通'
  const studentName = input.studentName || '同學'
  const courseName = input.courseName || '已報名課程'

  return sendEmail({
    to: input.to,
    subject,
    text: `${studentName}你好：\n\n你的 ${courseName} 報名付款已經核准，課表已開通。\n\n你現在可以登入學員中心查看課表，並在完成訓練後提交訓練反饋。\n\n學員中心：https://haoyunrunning.com/student\n\n好運跑班`,
    html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#111827;">
          <h2>課表已開通</h2>
          <p>${studentName}你好：</p>
          <p>你的 <strong>${courseName}</strong> 報名付款已經核准，課表已開通。</p>
          <p>你現在可以登入學員中心查看課表，並在完成訓練後提交訓練反饋。</p>
          <p><a href="https://haoyunrunning.com/student">進入學員中心</a></p>
          <p>好運跑班</p>
        </div>
      `,
    skipLog: '[email] Enrollment approved email skipped: RESEND_API_KEY or sender env is missing.',
    skipMessage: '郵件服務尚未設定，已完成核准但未發送郵件。',
    failMessage: '核准已完成，但郵件發送失敗，請稍後檢查郵件服務設定。',
    successMessage: '核准已完成，並已發送課表開通郵件。',
  })
}

export async function sendTransferReminderEmail(input: TransferReminderEmailInput): Promise<EmailResult> {
  const studentName = input.studentName || '同學'
  const courseName = input.courseName || '已報名課程'

  return sendEmail({
    to: input.to,
    subject: '提醒填寫銀行帳號後五碼',
    text: `${studentName}你好：\n\n你已經確認報名 ${courseName}，目前系統還沒有收到你的銀行帳號後五碼。\n\n完成匯款後，請回到網站付款頁填寫後五碼，方便我們人工核對並開通課表。\n\n付款頁：https://haoyunrunning.com/payment\n\n好運跑班`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#111827;">
        <h2>提醒填寫銀行帳號後五碼</h2>
        <p>${studentName}你好：</p>
        <p>你已經確認報名 <strong>${courseName}</strong>，目前系統還沒有收到你的銀行帳號後五碼。</p>
        <p>完成匯款後，請回到網站付款頁填寫後五碼，方便我們人工核對並開通課表。</p>
        <p><a href="https://haoyunrunning.com/payment">回到付款頁填寫後五碼</a></p>
        <p>好運跑班</p>
      </div>
    `,
    skipLog: '[email] Transfer reminder email skipped: RESEND_API_KEY or sender env is missing.',
    skipMessage: '郵件服務尚未設定，提醒任務已跳過發送。',
    failMessage: '提醒郵件發送失敗，請稍後檢查郵件服務設定。',
    successMessage: '提醒郵件已發送。',
  })
}
