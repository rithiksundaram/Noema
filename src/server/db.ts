/// <reference types="node" />
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Noema's shared data: who is connected to whom, and the messages sent between them.
 * Stored as a JSON file next to the project (git-ignored). Swap for a hosted database before launch.
 */
export type LinkStatus = 'pending' | 'accepted' | 'declined';

export type Link = {
  id: string;
  operatorId: string;
  memberId: string;
  /** What the operator calls them, e.g. "Grandchild". */
  relation: string;
  status: LinkStatus;
  createdAt: number;
  respondedAt?: number;
};

export type StoredQA = { question: string; answer: string; via: 'tap' | 'voice' | 'type' };

export type StoredMessage = {
  id: string;
  operatorId: string;
  text: string;
  answers: StoredQA[];
  recipientIds: string[];
  readBy: string[];
  createdAt: number;
};

type Db = { links: Link[]; messages: StoredMessage[] };

const FILE = path.join(process.cwd(), 'data', 'noema-db.json');

let cache: Db | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Db> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(FILE, 'utf8')) as Db;
  } catch {
    cache = { links: [], messages: [] };
  }
  return cache;
}

async function save(db: Db) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, FILE);
}

/** Read-only access. */
export async function read<T>(fn: (db: Db) => T): Promise<T> {
  await queue;
  return fn(await load());
}

/** Runs changes one at a time so two requests can never overwrite each other. */
export function write<T>(fn: (db: Db) => T): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = fn(db);
    await save(db);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
