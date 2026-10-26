import { createClerkClient, verifyToken } from '@clerk/backend';

const secretKey = process.env.CLERK_SECRET_KEY;
export const clerk = createClerkClient({ secretKey });

export type Role = 'operator' | 'member';
export type Person = { id: string; username: string; name: string; imageUrl: string | null; role: Role };

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Checks the Clerk session token sent by the app and returns who is asking. */
export async function requireUser(request: Request): Promise<Person> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Please log in again.');
  let userId: string;
  try {
    const payload = await verifyToken(token, { secretKey });
    userId = payload.sub;
  } catch {
    throw new HttpError(401, 'Please log in again.');
  }
  return getPerson(userId, true);
}

type ClerkUser = Awaited<ReturnType<typeof clerk.users.getUser>>;

function toPerson(u: ClerkUser): Person {
  const role = (u.unsafeMetadata?.role as Role) === 'member' ? 'member' : 'operator';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Someone';
  return { id: u.id, username: u.username ?? '', name, imageUrl: u.hasImage ? u.imageUrl : null, role };
}

// Short cache so lists of people don't call Clerk on every refresh.
const people = new Map<string, { at: number; person: Person }>();
const TTL = 30_000;

export async function getPerson(id: string, fresh = false): Promise<Person> {
  const hit = people.get(id);
  if (!fresh && hit && Date.now() - hit.at < TTL) return hit.person;
  const person = toPerson(await clerk.users.getUser(id));
  people.set(id, { at: Date.now(), person });
  return person;
}

export async function getPeople(ids: string[]): Promise<Map<string, Person>> {
  const unique = [...new Set(ids)];
  const out = new Map<string, Person>();
  const missing = unique.filter((id) => {
    const hit = people.get(id);
    if (hit && Date.now() - hit.at < TTL) {
      out.set(id, hit.person);
      return false;
    }
    return true;
  });
  if (missing.length) {
    const { data } = await clerk.users.getUserList({ userId: missing, limit: 100 });
    for (const u of data) {
      const person = toPerson(u);
      people.set(u.id, { at: Date.now(), person });
      out.set(u.id, person);
    }
  }
  return out;
}

export async function findByUsername(username: string): Promise<Person | null> {
  const { data } = await clerk.users.getUserList({ username: [username.toLowerCase()], limit: 1 });
  return data[0] ? toPerson(data[0]) : null;
}

/** Wraps an API handler: turns thrown HttpErrors into friendly JSON errors. */
export function handle<A extends unknown[]>(fn: (request: Request, ...rest: A) => Promise<unknown>) {
  return async (request: Request, ...rest: A) => {
    try {
      return Response.json(await fn(request, ...rest));
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
  };
}

export async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, 'Bad request.');
  }
}
