/**
 * Trigger a Cloudflare Workers Builds rebuild after content that is publicly
 * visible changes (approve/publish/delete). POSTs to the Deploy Hook URL.
 *
 * Only fires when DEPLOY_HOOK_URL is set; otherwise it's a no-op (local dev).
 * Deploy Hooks are idempotent server-side, so bursts collapse into one build.
 */
export async function triggerRebuild(): Promise<void> {
  const hook = process.env.DEPLOY_HOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, { method: 'POST' });
  } catch (err) {
    console.error('[rebuild] deploy hook failed:', err);
  }
}
