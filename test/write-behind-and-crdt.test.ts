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
import {
  newer,
  checkElement,
  generateAiExcalidrawLessonForQuery,
  wrapLessonInBoundedZone,
  extractWhiteboardSelectionContext,
} from '../src/shared/whiteboard';

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

test('Excalidraw Whiteboard - merges elements by version/versionNonce and generates AI simulation frames', () => {
  assert.strictEqual(
    newer({ version: 2, versionNonce: 500 }, { version: 1, versionNonce: 100 }),
    true
  );
  assert.strictEqual(
    newer({ version: 2, versionNonce: 50 }, { version: 2, versionNonce: 100 }),
    true
  );

  const lesson = generateAiExcalidrawLessonForQuery(
    'Simulate Two Pointers on [1, 3, 5, 8, 12, 17, 21] target 17'
  );
  assert.ok(lesson.frames.length >= 3);
  assert.ok(lesson.frames[0]!.elements.length > 0);
  const checked = checkElement(lesson.frames[0]!.elements[0]);
  assert.ok(checked !== undefined);

  // Verify bounded non-overlapping zones isolate element IDs and coordinates
  const z1 = wrapLessonInBoundedZone(lesson, {
    zoneId: 'zone_1',
    zoneIndex: 0,
    originX: 40,
    originY: 40,
  });
  const z2 = wrapLessonInBoundedZone(lesson, {
    zoneId: 'zone_2',
    zoneIndex: 1,
    originX: 920,
    originY: 40,
  });
  assert.ok(z1.frames[0]!.elements.every((el) => el.id.startsWith('zone_1__')));
  assert.ok(z2.frames[0]!.elements.every((el) => el.id.startsWith('zone_2__')));
  assert.ok(z2.zoneBounds!.x >= z1.zoneBounds!.x + z1.zoneBounds!.width);

  // Verify user drag-selection context extraction & Brute Force dry-run generation
  const selCtx = extractWhiteboardSelectionContext(
    [
      { id: 'c1', type: 'rectangle', x: 100, y: 180, width: 60, height: 60 },
      { id: 't1', type: 'text', x: 115, y: 195, width: 30, height: 24, text: '4' },
      { id: 't2', type: 'text', x: 185, y: 195, width: 30, height: 24, text: '7' },
      { id: 't3', type: 'text', x: 255, y: 195, width: 30, height: 24, text: '11' },
      { id: 't4', type: 'text', x: 325, y: 195, width: 30, height: 24, text: '18' },
    ],
    { c1: true, t1: true, t2: true, t3: true, t4: true }
  );
  assert.deepStrictEqual(selCtx.extractedNumbers, [4, 7, 11, 18]);

  const bfLesson = generateAiExcalidrawLessonForQuery(
    'how would the dry run of the brute force approach of this question look',
    selCtx
  );
  assert.strictEqual(bfLesson.id, 'brute_force_dry_run');
  assert.ok(bfLesson.frames.length >= 2);
  assert.ok((bfLesson.frames[0]!.aiLaserWaypoints?.length ?? 0) >= 2);

  // Verify all 7 new global DSA lesson families (Graphs, 2D Grid, Hash Map, Heap, Trie, Intervals, QuickSort)
  const globalQueries: Array<[string, string]> = [
    ['Simulate Dijkstra shortest path on a weighted graph', 'graph_shortest_path'],
    ['Simulate 2D Matrix Number of Islands flood fill BFS', 'matrix_2d_bfs'],
    ['Show Hash Map complement lookup for Two Sum', 'hashmap_lookup'],
    ['Demonstrate Min-Heap priority queue sift-up', 'heap_priority_queue'],
    ['Draw Trie prefix tree inserting APP and APPLE', 'trie_prefix_tree'],
    ['Simulate Merge Overlapping Intervals on timeline', 'merge_intervals'],
    ['Demonstrate QuickSort partition around pivot', 'quicksort_partition'],
  ];

  for (const [q, expectedId] of globalQueries) {
    const built = generateAiExcalidrawLessonForQuery(q);
    assert.strictEqual(built.id, expectedId, `Expected "${q}" to resolve to ${expectedId}`);
    assert.ok(built.frames.length >= 3);
    assert.ok(built.frames[0]!.elements.length > 0);
  }
});

test('User Key Vault strictly routes AI calls to each user personal API key in AsyncLocalStorage', async () => {
  const { saveUserApiKeyToVault, attachUserKeyVaultContext, getActiveRequestUserKeys } = await import(
    '../src/lib/user-keys.server.ts'
  );
  const { getGeminiKey, getOpenRouterKey, getOpenAIKey } = await import(
    '../src/lib/openrouter.server.ts'
  );

  const setCookies: string[] = [];
  const mockReqSave: any = {
    headers: {},
    secure: false,
  };
  const mockResSave: any = {
    append: (_header: string, val: string) => {
      setCookies.push(val);
    },
  };

  const fakeUserGeminiKey = 'AIzaSyUserPersonalVaultKeyTest999888777';
  const saved = await saveUserApiKeyToVault(mockReqSave, mockResSave, {
    apiKey: fakeUserGeminiKey,
    provider: 'gemini',
    verify: false,
  });

  assert.strictEqual(saved.ok, true);
  assert.strictEqual(saved.provider, 'gemini');
  assert.ok(saved.sealedVault && saved.sealedVault.split('.').length === 3);
  assert.ok(setCookies.length >= 2);

  const cookieHeader = setCookies
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ');

  const mockReqAiCall: any = {
    headers: {
      cookie: cookieHeader,
      'x-encrypted-account-vault': saved.sealedVault,
    },
  };
  const mockResAiCall: any = {};

  await new Promise<void>((resolve, reject) => {
    attachUserKeyVaultContext(mockReqAiCall, mockResAiCall, () => {
      try {
        const active = getActiveRequestUserKeys();
        assert.ok(active);
        assert.strictEqual(active.hasPersonalKey, true);
        assert.strictEqual(active.geminiKey, fakeUserGeminiKey);
        assert.strictEqual(getGeminiKey(), fakeUserGeminiKey);
        // When user has a personal Gemini key, other providers they did not configure must NOT leak server .env keys
        assert.strictEqual(getOpenRouterKey(), '');
        assert.strictEqual(getOpenAIKey(), '');
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
});



