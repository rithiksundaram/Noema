import { handle, HttpError, requireUser } from '@/server/auth';
import { write } from '@/server/db';
import { stateFor } from '@/server/state';

/** DELETE /api/messages/:id — the operator unsends their message; it disappears for everyone. */
export const DELETE = handle(async (request, { id }: Record<string, string>) => {
  const me = await requireUser(request);
  await write((db) => {
    const msg = db.messages.find((m) => m.id === id);
    if (!msg || msg.operatorId !== me.id) throw new HttpError(404, 'That message no longer exists.');
    db.messages = db.messages.filter((m) => m.id !== id);
  });
  return stateFor(me);
});
