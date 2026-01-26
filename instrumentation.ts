export async function register() {
  // Runs on server start in Next.js (Node runtime). We use it to start small background schedulers.
  if ((process.env.INSTAGRAM_FOLLOWUP_ENABLED || '').trim() !== 'true') return

  // Avoid running in Edge runtime.
  if ((process.env.NEXT_RUNTIME || '').toLowerCase() === 'edge') return

  try {
    const mod = await import('./app/api/instagram/followupScheduler')
    mod.startInstagramFollowupScheduler()
  } catch (e) {
    console.error('Failed to start IG followup scheduler', e)
  }
}


