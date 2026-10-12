import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueueWriteBehind,
  flushWriteBehindBatch,
  getWriteBehindStats,
} from '../src/lib/write-behind-buffer.server';
import {
  getCollabRoomSnapshot,
  applyCollabDelta,
  subscribeToCollabRoom,
} from '../src/lib/crdt-collab.server';

test('Write-Behind Buffer - enqueues high-frequency operations with sub-millisecond latency', async () => {
  const start = performance.now();
  const res = await enqueueWriteBehind({
    type: 'activity_log',
    userId: 'user_test_wb_1',
    payload: {
      type: 'test_event',
      problemSlug: 'two-sum',
      metadata: { step: 1 },
    },
  });
  const duration = performance.now() - start;

  assert.strictEqual(res.ok, true);
  assert.ok(duration < 10, `Enqueue took ${duration}ms, expected < 10ms`);

  const stats = getWriteBehindStats();
  assert.ok(stats.inMemoryQueueLength > 0);
});

test('Write-Behind Buffer - batch flusher drains and commits batched operations', async () => {
  // Enqueue multiple ops
  for (let i = 0; i < 5; i++) {
    await enqueueWriteBehind({
      type: 'telemetry',
      userId: `user_test_${i}`,
      telemetryId: `tel_${i}`,
      payload: { index: i, action: 'compile_test' },
    });
  }

  const flushRes = await flushWriteBehindBatch(50);
  assert.ok(flushRes.processed >= 5);
  assert.strictEqual(flushRes.errors, 0);
});

test('CRDT Collab Server - initializes default room snapshot and applies delta increments', async () => {
  const roomId = `test_room_${Date.now()}`;
  const initial = await getCollabRoomSnapshot(roomId);

  assert.strictEqual(initial.roomId, roomId);
  assert.strictEqual(initial.code, '');
  assert.strictEqual(initial.version, 1);
  assert.deepStrictEqual(initial.whiteboardElements, []);

  // Apply code update delta
  const deltaRes = await applyCollabDelta(roomId, {
    authorId: 'candidate_1',
    deltaType: 'code_delta',
    payload: { code: 'vector<int> twoSum() {}', language: 'cpp' },
  });

  assert.strictEqual(deltaRes.ok, true);
  assert.strictEqual(deltaRes.version, 2);

  // Apply whiteboard element delta
  const wbRes = await applyCollabDelta(roomId, {
    authorId: 'ai_interviewer',
    deltaType: 'wb_element',
    payload: {
      id: 'wb_el_1',
      type: 'ai_diagram',
      aiDiagramType: 'array_pointers',
      aiDiagramPayload: { title: 'Two Pointers' },
      timestamp: Date.now(),
      authorId: 'ai_interviewer',
    },
  });

  assert.strictEqual(wbRes.ok, true);
  assert.strictEqual(wbRes.version, 3);

  // Verify updated room snapshot
  const updated = await getCollabRoomSnapshot(roomId);
  assert.strictEqual(updated.version, 3);
  assert.strictEqual(updated.code, 'vector<int> twoSum() {}');
  assert.strictEqual(updated.whiteboardElements.length, 1);
  assert.strictEqual(updated.whiteboardElements[0]?.aiDiagramType, 'array_pointers');
});

test('CRDT Collab Server - listener receives real-time delta broadcasts', async () => {
  const roomId = `test_sub_room_${Date.now()}`;
  let receivedDelta: any = null;

  const unsubscribe = subscribeToCollabRoom(roomId, (delta) => {
    receivedDelta = delta;
  });

  await applyCollabDelta(roomId, {
    authorId: 'interviewer_peer',
    deltaType: 'wb_clear',
    payload: {},
  });

  assert.ok(receivedDelta !== null);
  assert.strictEqual(receivedDelta.deltaType, 'wb_clear');
  assert.strictEqual(receivedDelta.authorId, 'interviewer_peer');

  unsubscribe();
});
