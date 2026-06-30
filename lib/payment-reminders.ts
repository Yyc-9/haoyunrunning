import { sendTransferReminderEmail } from '@/lib/email'
import { supabaseAdmin } from '@/lib/supabase-server'

type PendingTransferLead = {
  id: string
  name: string
  email: string
  preferred_course: string
  created_at: string
}

type ReminderResult = {
  id: string
  email: string
  sent: boolean
  skipped?: boolean
  message: string
}

export async function checkPendingTransferReminders(options: { dryRun?: boolean; now?: Date } = {}) {
  if (!supabaseAdmin) {
    return {
      checked: 0,
      sent: 0,
      results: [] as ReminderResult[],
      message: 'Supabase 尚未設定，暂时無法檢查待匯款提醒。',
    }
  }

  const now = options.now ?? new Date()
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('signup_leads')
    .select('id, name, email, preferred_course, created_at')
    .eq('source', 'course_payment')
    .eq('status', 'pending_transfer')
    .not('email', 'is', null)
    .lte('created_at', cutoff)
    .is('reminder_sent_at', null)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    throw error
  }

  const leads = (data ?? []) as PendingTransferLead[]

  if (options.dryRun) {
    return {
      checked: leads.length,
      sent: 0,
      results: leads.map((lead) => ({
        id: lead.id,
        email: lead.email,
        sent: false,
        skipped: true,
        message: 'dryRun：符合提醒條件，但未發送郵件。',
      })),
      message: `dryRun 完成，共 ${leads.length} 笔 pending_transfer 超過 24 小時。`,
    }
  }

  const results: ReminderResult[] = []

  for (const lead of leads) {
    const emailResult = await sendTransferReminderEmail({
      to: lead.email,
      studentName: lead.name,
      courseName: lead.preferred_course,
    })

    results.push({
      id: lead.id,
      email: lead.email,
      sent: emailResult.sent,
      skipped: emailResult.skipped,
      message: emailResult.message,
    })

    if (emailResult.sent) {
      const { error: updateError } = await supabaseAdmin
        .from('signup_leads')
        .update({ reminder_sent_at: now.toISOString() })
        .eq('id', lead.id)

      if (updateError) {
        results[results.length - 1].message = `提醒郵件已發送，但記錄提醒时间失敗：${updateError.message}`
      }
    }
  }

  return {
    checked: leads.length,
    sent: results.filter((item) => item.sent).length,
    results,
    message: `檢查完成，共 ${leads.length} 笔待提醒，已發送 ${results.filter((item) => item.sent).length} 封。`,
  }
}
