import { body, findByUsername, handle, HttpError, requireUser } from '@/server/auth';
import { newId, write } from '@/server/db';
import { stateFor } from '@/server/state';

/**
 * POST /api/links — an operator invites a family member by their Noema username.
 * The member has to accept before they are connected or can receive anything.
 */
export const POST = handle(async (request) => {
  const me = await requireUser(request);
  if (me.role !== 'operator') throw new HttpError(403, 'Only the person sharing their day can add family.');

  const { username, relation } = await body<{ username?: string; relation?: string }>(request);
  const clean = (username ?? '').trim().replace(/^@/, '');
  if (!clean) throw new HttpError(400, 'Enter their username.');

  const target = await findByUsername(clean);
  if (!target) throw new HttpError(404, `No one on Noema has the username @${clean}. Check the spelling with them.`);
  if (target.id === me.id) throw new HttpError(400, "That's your own username.");
  if (target.role !== 'member') throw new HttpError(400, `@${clean} is set up to share their own day, so they can't be added as family.`);

  await write((db) => {
    const existing = db.links.find((l) => l.operatorId === me.id && l.memberId === target.id);
    if (existing?.status === 'accepted') throw new HttpError(409, `${target.name} is already in your family.`);
    if (existing?.status === 'pending') throw new HttpError(409, `You already invited ${target.name}. Waiting for them to accept.`);
    // A declined invite can be sent again.
    db.links = db.links.filter((l) => l !== existing);
    db.links.push({
      id: newId(),
      operatorId: me.id,
      memberId: target.id,
      relation: (relation ?? 'Family').slice(0, 30),
      status: 'pending',
      createdAt: Date.now(),
    });
  });
  return stateFor(me);
});
