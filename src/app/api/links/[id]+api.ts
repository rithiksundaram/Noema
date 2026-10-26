import { handle, HttpError, requireUser } from '@/server/auth';
import { write } from '@/server/db';
import { stateFor } from '@/server/state';

/**
 * DELETE /api/links/:id — either side ends the connection
 * (operator removes someone or cancels an invite; a member leaves a family).
 */
export const DELETE = handle(async (request, { id }: Record<string, string>) => {
  const me = await requireUser(request);
  await write((db) => {
    const link = db.links.find((l) => l.id === id);
    if (!link || (link.operatorId !== me.id && link.memberId !== me.id)) throw new HttpError(404, 'That connection no longer exists.');
    db.links = db.links.filter((l) => l.id !== id);
  });
  return stateFor(me);
});
