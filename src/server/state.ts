import { getPeople, type Person } from './auth';
import { read, type Link, type StoredMessage } from './db';

export type PersonView = Pick<Person, 'id' | 'username' | 'name' | 'imageUrl'>;

export type LinkView = {
  id: string;
  status: Link['status'];
  relation: string;
  createdAt: number;
  /** The other person: the family member (for operators) or the operator (for members). */
  other: PersonView;
};

export type MessageView = {
  id: string;
  text: string;
  createdAt: number;
  from: PersonView;
  recipients: PersonView[];
  /** Only sent to the operator who wrote it. */
  answers?: StoredMessage['answers'];
  readBy: string[];
};

export type AppState = { role: Person['role']; links: LinkView[]; messages: MessageView[] };

const view = (p: Person | undefined, id: string): PersonView =>
  p ? { id: p.id, username: p.username, name: p.name, imageUrl: p.imageUrl } : { id, username: '', name: 'Deleted account', imageUrl: null };

/** Everything one person is allowed to see, and nothing more. */
export async function stateFor(me: Person): Promise<AppState> {
  const { links, messages } = await read((db) => {
    if (me.role === 'operator') {
      return {
        links: db.links.filter((l) => l.operatorId === me.id && l.status !== 'declined'),
        messages: db.messages.filter((m) => m.operatorId === me.id),
      };
    }
    const mine = db.links.filter((l) => l.memberId === me.id && l.status !== 'declined');
    const connected = new Set(mine.filter((l) => l.status === 'accepted').map((l) => l.operatorId));
    return {
      links: mine,
      // Members only get messages addressed to them, from operators they have accepted.
      messages: db.messages.filter((m) => connected.has(m.operatorId) && m.recipientIds.includes(me.id)),
    };
  });

  const ids = [
    ...links.flatMap((l) => [l.operatorId, l.memberId]),
    ...messages.flatMap((m) => [m.operatorId, ...m.recipientIds]),
  ];
  const people = await getPeople(ids);

  return {
    role: me.role,
    links: links
      .map((l) => {
        const otherId = me.role === 'operator' ? l.memberId : l.operatorId;
        return { id: l.id, status: l.status, relation: l.relation, createdAt: l.createdAt, other: view(people.get(otherId), otherId) };
      })
      .sort((a, b) => b.createdAt - a.createdAt),
    messages: messages
      .map((m) => ({
        id: m.id,
        text: m.text,
        createdAt: m.createdAt,
        from: view(people.get(m.operatorId), m.operatorId),
        recipients: (me.role === 'operator' ? m.recipientIds : [me.id]).map((id) => view(people.get(id), id)),
        answers: me.role === 'operator' ? m.answers : undefined,
        readBy: me.role === 'operator' ? m.readBy : m.readBy.filter((id) => id === me.id),
      }))
      .sort((a, b) => b.createdAt - a.createdAt),
  };
}
