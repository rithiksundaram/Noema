/** Pulls a friendly sentence out of whatever Clerk throws or returns. */
export function clerkMessage(e: unknown): string {
  const err = e as { errors?: { longMessage?: string; message?: string }[]; longMessage?: string; message?: string } | null;
  return err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.longMessage ?? err?.message ?? 'Something went wrong. Please try again.';
}
