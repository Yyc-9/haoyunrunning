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
  const subject = '好运跑班课表已开通'
  const studentName = input.studentName || '同学'
  const courseName = input.courseName || '已报名课程'

  return sendEmail({
    to: input.to,
    subject,
    text: `${studentName}你好：\n\n你的 ${courseName} 报名付款已经核准，课表已开通。\n\n你现在可以登录学员中心查看课表，并在完成训练后提交训练反馈。\n\n学员中心：https://haoyunrunning.com/student\n\n好运跑班`,
    html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#111827;">
          <h2>课表已开通</h2>
          <p>${studentName}你好：</p>
          <p>你的 <strong>${courseName}</strong> 报名付款已经核准，课表已开通。</p>
          <p>你现在可以登录学员中心查看课表，并在完成训练后提交训练反馈。</p>
          <p><a href="https://haoyunrunning.com/student">进入学员中心</a></p>
          <p>好运跑班</p>
        </div>
      `,
    skipLog: '[email] Enrollment approved email skipped: RESEND_API_KEY or sender env is missing.',
    skipMessage: '邮件服务尚未配置，已完成核准但未发送邮件。',
    failMessage: '核准已完成，但邮件发送失败，请稍后检查邮件服务配置。',
    successMessage: '核准已完成，并已发送课表开通邮件。',
  })
}

export async function sendTransferReminderEmail(input: TransferReminderEmailInput): Promise<EmailResult> {
  const studentName = input.studentName || '同学'
  const courseName = input.courseName || '已报名课程'

  return sendEmail({
    to: input.to,
    subject: '提醒填写银行账号后五码',
    text: `${studentName}你好：\n\n你已经确认报名 ${courseName}，目前系统还没有收到你的银行账号后五码。\n\n完成汇款后，请回到网站付款页填写后五码，方便我们人工核对并开通课表。\n\n付款页：https://haoyunrunning.com/payment\n\n好运跑班`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#111827;">
        <h2>提醒填写银行账号后五码</h2>
        <p>${studentName}你好：</p>
        <p>你已经确认报名 <strong>${courseName}</strong>，目前系统还没有收到你的银行账号后五码。</p>
        <p>完成汇款后，请回到网站付款页填写后五码，方便我们人工核对并开通课表。</p>
        <p><a href="https://haoyunrunning.com/payment">回到付款页填写后五码</a></p>
        <p>好运跑班</p>
      </div>
    `,
    skipLog: '[email] Transfer reminder email skipped: RESEND_API_KEY or sender env is missing.',
    skipMessage: '邮件服务尚未配置，提醒任务已跳过发送。',
    failMessage: '提醒邮件发送失败，请稍后检查邮件服务配置。',
    successMessage: '提醒邮件已发送。',
  })
}
