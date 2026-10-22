import test from "node:test";
import assert from "node:assert/strict";
import { AgUiEventType } from "../src/lib/ag-ui/types";
import { AgUiStateSyncEngine } from "../src/lib/ag-ui/state-sync";
import { AgUiStreamWriter } from "../src/lib/ag-ui/stream-writer";
import { Writable } from "node:stream";

test("AG-UI Protocol - Event Taxonomy completeness", () => {
  const events = Object.values(AgUiEventType);
  assert.ok(events.includes(AgUiEventType.RUN_STARTED));
  assert.ok(events.includes(AgUiEventType.RUN_FINISHED));
  assert.ok(events.includes(AgUiEventType.STEP_STARTED));
  assert.ok(events.includes(AgUiEventType.STEP_FINISHED));
  assert.ok(events.includes(AgUiEventType.TEXT_MESSAGE_CONTENT));
  assert.ok(events.includes(AgUiEventType.REASONING_MESSAGE_CONTENT));
  assert.ok(events.includes(AgUiEventType.TOOL_CALL_START));
  assert.ok(events.includes(AgUiEventType.TOOL_CALL_RESULT));
  assert.ok(events.includes(AgUiEventType.STATE_SNAPSHOT));
  assert.ok(events.includes(AgUiEventType.STATE_DELTA));
});

test("AG-UI State Synchronization - RFC 6902 JSON Patch computation", () => {
  const engine = new AgUiStateSyncEngine({
    activeStep: 0,
    array: [5, 2, 8, 1],
    telemetry: { status: "idle" },
  });

  const snapshot = engine.getSnapshot();
  assert.equal(snapshot.version, 1);
  assert.deepEqual(snapshot.state.array, [5, 2, 8, 1]);

  // Apply state modification
  const nextState = {
    activeStep: 1,
    array: [1, 2, 8, 5],
    telemetry: { status: "active", executionTimeMs: 12 },
  };

  const { ops, baseVersion, targetVersion } = engine.updateAndDiff(nextState);

  assert.equal(baseVersion, 1);
  assert.equal(targetVersion, 2);
  assert.ok(ops.length > 0);

  // Validate patch operations adhere to RFC 6902
  for (const op of ops) {
    assert.ok(["add", "remove", "replace", "move", "copy", "test"].includes(op.op));
    assert.ok(op.path.startsWith("/"));
  }

  // Check patched current state
  const updatedSnapshot = engine.getSnapshot();
  assert.equal(updatedSnapshot.version, 2);
  assert.equal(updatedSnapshot.state.activeStep, 1);
  assert.deepEqual(updatedSnapshot.state.array, [1, 2, 8, 5]);
});

test("AG-UI StreamWriter - Formats SSE chunks with id and data lines", () => {
  const outputChunks: string[] = [];

  const mockRes: any = new Writable({
    write(chunk, _encoding, callback) {
      outputChunks.push(chunk.toString());
      callback();
    },
  });
  mockRes.setHeader = () => {};
  mockRes.flushHeaders = () => {};

  const writer = new AgUiStreamWriter(mockRes);

  writer.sendRunStart("run_test_123", "Test Agent", "gemini-2.5-flash");
  writer.sendStepStart("step_1", "Decomposition");
  writer.sendReasoningContent("Analyzing constraints...");
  writer.sendTextMessageContent("msg_1", "Optimal algorithm is O(N).");
  writer.sendToolStart("tool_1", "run_code_sandbox");
  writer.sendToolResult("tool_1", { exitCode: 0, output: "OK" });
  writer.sendRunEnd("run_test_123", 45);

  const fullOutput = outputChunks.join("");

  assert.match(fullOutput, /id: 1\ndata: \{"type":"RUN_STARTED"/);
  assert.match(fullOutput, /"agentName":"Test Agent"/);
  assert.match(fullOutput, /id: 2\ndata: \{"type":"STEP_STARTED"/);
  assert.match(fullOutput, /id: 3\ndata: \{"type":"REASONING_MESSAGE_CONTENT"/);
  assert.match(fullOutput, /Analyzing constraints\.\.\./);
  assert.match(fullOutput, /id: 4\ndata: \{"type":"TEXT_MESSAGE_CONTENT"/);
  assert.match(fullOutput, /Optimal algorithm is O\(N\)\./);
  assert.match(fullOutput, /id: 5\ndata: \{"type":"TOOL_CALL_START"/);
  assert.match(fullOutput, /id: 6\ndata: \{"type":"TOOL_CALL_RESULT"/);
  assert.match(fullOutput, /id: 7\ndata: \{"type":"RUN_FINISHED"/);
});
