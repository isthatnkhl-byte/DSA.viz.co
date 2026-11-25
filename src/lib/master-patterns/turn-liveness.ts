/**
 * Server-side per-session turn liveness & ownership fence
 * (ported from LearnHarness src/server/turn-liveness.ts).
 *
 * Lives on globalThis so separate route modules or hot-reloaded dev entries
 * share one authoritative lock table. Prevents concurrent grading/mutation
 * races on the same pattern session (returning 409 Conflict) and uses
 * private owner tokens + TTL leak guards so stale runs never unlock newer turns.
 */

interface PatternTurnGlobal {
  __dsavizPatternTurnRegistry?: Map<string, number>;
  __dsavizPatternTurnOwners?: Map<string, object>;
}

const MAX_PATTERN_TURN_MS = 120_000; // 2 minutes max per AI turn

function getRegistry(): Map<string, number> {
  const g = globalThis as typeof globalThis & PatternTurnGlobal;
  return (g.__dsavizPatternTurnRegistry ??= new Map<string, number>());
}

function getOwners(): Map<string, object> {
  const g = globalThis as typeof globalThis & PatternTurnGlobal;
  return (g.__dsavizPatternTurnOwners ??= new Map<string, object>());
}

export function isPatternTurnRunning(sessionId: string): boolean {
  const registry = getRegistry();
  const owners = getOwners();
  const startedAt = registry.get(sessionId);
  if (startedAt === undefined) return false;
  if (Date.now() - startedAt > MAX_PATTERN_TURN_MS) {
    registry.delete(sessionId);
    owners.delete(sessionId);
    return false;
  }
  return true;
}

export function beginPatternTurn(sessionId: string, ownerToken: object): boolean {
  if (isPatternTurnRunning(sessionId)) return false;
  getOwners().set(sessionId, ownerToken);
  getRegistry().set(sessionId, Date.now());
  return true;
}

export function endPatternTurn(sessionId: string, ownerToken: object): void {
  const owners = getOwners();
  if (owners.get(sessionId) !== ownerToken) return;
  owners.delete(sessionId);
  getRegistry().delete(sessionId);
}
