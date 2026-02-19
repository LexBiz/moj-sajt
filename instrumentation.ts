export async function register() {
  // Avoid running in Edge runtime.
  if ((process.env.NEXT_RUNTIME || '').toLowerCase() === 'edge') return

  try {
    if ((process.env.INSTAGRAM_FOLLOWUP_ENABLED || '').trim() === 'true') {
      const mod = await import('./app/api/instagram/followupScheduler')
      mod.startInstagramFollowupScheduler()
    }
  } catch (e) {
    console.error('Failed to start IG followup scheduler', e)
  }

  try {
    if ((process.env.ASSISTANT_REMINDERS_ENABLED || 'true').trim() !== 'false') {
      const mod = await import('./app/api/admin/assistant/reminderScheduler')
      mod.startAssistantReminderScheduler()
    }
  } catch (e) {
    console.error('Failed to start Assistant reminder scheduler', e)
  }
}


