import { handle, HttpError, requireUser } from '@/server/auth';
import { write } from '@/server/db';
import { stateFor } from '@/server/state';

/** POST /api/messages/:id/read — a family member opened the message, so the sender can see it was read. */
export const POST = handle(async (request, { id }: Record<string, string>) => {
  const me = await requireUser(request);
  await write((db) => {
    const msg = db.messages.find((m) => m.id === id);
    if (!msg || !msg.recipientIds.includes(me.id)) throw new HttpError(404, 'That message no longer exists.');
    if (!msg.readBy.includes(me.id)) msg.readBy.push(me.id);
  });
  return stateFor(me);
});
