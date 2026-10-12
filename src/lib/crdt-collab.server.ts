import { getRawRedisClient, createRedisPubSubClients } from './redis-cache';

export interface WhiteboardElement {
  id: string;
  type: 'stroke' | 'shape' | 'text' | 'ai_diagram' | 'clear';
  tool?: string;
  points?: Array<{ x: number; y: number }>;
  color?: string;
  size?: number;
  text?: string;
  shapeData?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    shapeType?: 'rectangle' | 'circle' | 'arrow';
  };
  aiDiagramType?: 'array_pointers' | 'two_pointers' | 'binary_search' | 'tree' | 'linked_list';
  aiDiagramPayload?: {
    title?: string;
    elements?: any[];
    pointers?: Array<{ label: string; index: number; color?: string }>;
    stepDescription?: string;
  };
  timestamp: number;
  authorId: string;
}

export interface CollabRoomState {
  roomId: string;
  code: string;
  language: string;
  whiteboardElements: WhiteboardElement[];
  version: number;
  updatedAt: number;
}

export interface CollabDeltaMessage {
  roomId: string;
  authorId: string;
  deltaType: 'code_delta' | 'wb_element' | 'wb_clear' | 'cursor_presence' | 'ai_simulation';
  payload: any;
  version: number;
  timestamp: number;
}

const ROOM_SNAPSHOT_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const MAX_LOCAL_ROOMS = 1000;
const localRoomSnapshots = new Map<string, CollabRoomState>();
const activeRoomListeners = new Map<string, Set<(delta: CollabDeltaMessage) => void>>();

// Redis Pub/Sub instances for cross-instance horizontal synchronization
const { pub: redisPub, sub: redisSub } = createRedisPubSubClients();
const subscribedChannels = new Set<string>();

if (redisSub) {
  redisSub.on('message', (channel, message) => {
    try {
      const match = channel.match(/^collab:bus:(.+)$/);
      if (!match || !match[1]) return;
      const roomId = match[1];
      const delta = JSON.parse(message) as CollabDeltaMessage;

      const listeners = activeRoomListeners.get(roomId);
      if (listeners && listeners.size > 0) {
        for (const listener of listeners) {
          try {
            listener(delta);
          } catch {}
        }
      }
    } catch {
      // Non-fatal broadcast parse error
    }
  });
}

function ensureRedisChannelSubscription(roomId: string) {
  if (!redisSub) return;
  const channel = `collab:bus:${roomId}`;
  if (!subscribedChannels.has(channel)) {
    subscribedChannels.add(channel);
    redisSub.subscribe(channel).catch(() => {});
  }
}

/**
 * Retrieve current CRDT room snapshot from Redis or local memory.
 */
export async function getCollabRoomSnapshot(roomId: string): Promise<CollabRoomState> {
  const cleanId = roomId.trim().slice(0, 128);

  const redis = getRawRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(`collab:snapshot:${cleanId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CollabRoomState;
        localRoomSnapshots.set(cleanId, parsed);
        return parsed;
      }
    } catch {
      // Fall through to memory
    }
  }

  const existingLocal = localRoomSnapshots.get(cleanId);
  if (existingLocal) {
    return existingLocal;
  }

  const defaultState: CollabRoomState = {
    roomId: cleanId,
    code: '',
    language: 'cpp',
    whiteboardElements: [],
    version: 1,
    updatedAt: Date.now(),
  };

  localRoomSnapshots.set(cleanId, defaultState);
  return defaultState;
}

/**
 * Applies a CRDT delta update, updates room snapshot in Redis, and publishes
 * to horizontal Redis Pub/Sub to inform all load-balanced server instances.
 */
export async function applyCollabDelta(
  roomId: string,
  delta: Omit<CollabDeltaMessage, 'version' | 'timestamp'>
): Promise<{ ok: boolean; version: number }> {
  const cleanId = roomId.trim().slice(0, 128);
  const current = await getCollabRoomSnapshot(cleanId);

  const newVersion = current.version + 1;
  const now = Date.now();

  const fullDelta: CollabDeltaMessage = {
    ...delta,
    roomId: cleanId,
    version: newVersion,
    timestamp: now,
  };

  // 1. Update state
  if (delta.deltaType === 'code_delta') {
    if (typeof delta.payload?.code === 'string') {
      current.code = delta.payload.code;
    }
    if (typeof delta.payload?.language === 'string') {
      current.language = delta.payload.language;
    }
  } else if (delta.deltaType === 'wb_element') {
    if (delta.payload && delta.payload.id) {
      // Retain max 500 whiteboard elements per room
      current.whiteboardElements = [...current.whiteboardElements.slice(-499), delta.payload];
    }
  } else if (delta.deltaType === 'wb_clear') {
    current.whiteboardElements = [];
  } else if (delta.deltaType === 'ai_simulation') {
    if (delta.payload && delta.payload.id) {
      current.whiteboardElements = [...current.whiteboardElements.slice(-499), delta.payload];
    }
  }

  current.version = newVersion;
  current.updatedAt = now;

  // 2. Persist snapshot to memory & Redis
  if (localRoomSnapshots.size >= MAX_LOCAL_ROOMS && !localRoomSnapshots.has(cleanId)) {
    const oldest = localRoomSnapshots.keys().next().value;
    if (oldest) localRoomSnapshots.delete(oldest);
  }
  localRoomSnapshots.set(cleanId, current);

  const redis = getRawRedisClient();
  if (redis) {
    try {
      await redis.set(`collab:snapshot:${cleanId}`, JSON.stringify(current), 'EX', ROOM_SNAPSHOT_TTL_SECONDS);
    } catch {}
  }

  // 3. Publish to Redis Pub/Sub backplane
  if (redisPub) {
    try {
      await redisPub.publish(`collab:bus:${cleanId}`, JSON.stringify(fullDelta));
    } catch {}
  }

  // 4. Local in-process broadcast
  const listeners = activeRoomListeners.get(cleanId);
  if (listeners && listeners.size > 0) {
    for (const listener of listeners) {
      try {
        listener(fullDelta);
      } catch {}
    }
  }

  return { ok: true, version: newVersion };
}

/**
 * Subscribes an SSE or WebSocket handler to real-time room updates.
 * Automatically wires into Redis Pub/Sub for cross-instance broadcasts.
 */
export function subscribeToCollabRoom(
  roomId: string,
  onDelta: (delta: CollabDeltaMessage) => void
): () => void {
  const cleanId = roomId.trim().slice(0, 128);
  ensureRedisChannelSubscription(cleanId);

  let listeners = activeRoomListeners.get(cleanId);
  if (!listeners) {
    listeners = new Set();
    activeRoomListeners.set(cleanId, listeners);
  }
  listeners.add(onDelta);

  return () => {
    listeners?.delete(onDelta);
    if (listeners?.size === 0) {
      activeRoomListeners.delete(cleanId);
    }
  };
}
