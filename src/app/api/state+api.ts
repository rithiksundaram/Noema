import { handle, requireUser } from '@/server/auth';
import { stateFor } from '@/server/state';

/** GET /api/state — the signed-in person's family connections and messages. */
export const GET = handle(async (request) => stateFor(await requireUser(request)));
