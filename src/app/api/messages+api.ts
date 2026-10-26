import { body, handle, HttpError, requireUser } from '@/server/auth';
import { newId, write, type StoredQA } from '@/server/db';
import { stateFor } from '@/server/state';

/** POST /api/messages — an operator sends a message to family members who accepted their invite. */
export const POST = handle(async (request) => {
  const me = await requireUser(request);
  if (me.role !== 'operator') throw new HttpError(403, 'Only the person sharing their day can send messages.');

  const { text, answers, recipientIds } = await body<{ text?: string; answers?: StoredQA[]; recipientIds?: string[] }>(request);
  const clean = (text ?? '').trim();
  if (!clean) throw new HttpError(400, 'The message is empty.');
  if (clean.length > 10_000) throw new HttpError(400, 'The message is too long.');

  const id = newId();
  await write((db) => {
    const accepted = new Set(db.links.filter((l) => l.operatorId === me.id && l.status === 'accepted').map((l) => l.memberId));
    const to = [...new Set(recipientIds ?? [])].filter((r) => accepted.has(r));
    if (to.length === 0) throw new HttpError(400, 'Pick at least one family member who has accepted your invite.');
    db.messages.push({
      id,
      operatorId: me.id,
      text: clean,
      answers: (answers ?? []).slice(0, 50).map((a) => ({ question: String(a.question), answer: String(a.answer), via: a.via })),
      recipientIds: to,
      readBy: [],
      createdAt: Date.now(),
    });
  });
  return { id, state: await stateFor(me) };
});
