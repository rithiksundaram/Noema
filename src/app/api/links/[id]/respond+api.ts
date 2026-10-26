import { body, handle, HttpError, requireUser } from '@/server/auth';
import { write } from '@/server/db';
import { stateFor } from '@/server/state';

/** POST /api/links/:id/respond — the invited member accepts or declines. Nobody is added without saying yes. */
export const POST = handle(async (request, { id }: Record<string, string>) => {
  const me = await requireUser(request);
  const { accept } = await body<{ accept?: boolean }>(request);
  await write((db) => {
    const link = db.links.find((l) => l.id === id);
    if (!link || link.memberId !== me.id) throw new HttpError(404, 'That invite no longer exists.');
    if (link.status !== 'pending') throw new HttpError(409, 'You already answered this invite.');
    link.status = accept ? 'accepted' : 'declined';
    link.respondedAt = Date.now();
  });
  return stateFor(me);
});
