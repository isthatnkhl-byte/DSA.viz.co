import jsonpatch, { type Operation } from "fast-json-patch";
import { JsonPatchOperation } from "./types";

const { compare, applyPatch } = jsonpatch;

/**
 * AgUiStateSyncEngine tracks state mutations and produces minimal
 * RFC 6902 JSON Patch arrays (STATE_DELTA) or full snapshots (STATE_SNAPSHOT).
 */
export class AgUiStateSyncEngine {
  private currentState: Record<string, any>;
  private version: number;

  constructor(initialState: Record<string, any> = {}) {
    this.currentState = JSON.parse(JSON.stringify(initialState));
    this.version = 1;
  }

  public getSnapshot(): { state: Record<string, any>; version: number } {
    return {
      state: JSON.parse(JSON.stringify(this.currentState)),
      version: this.version,
    };
  }

  public getVersion(): number {
    return this.version;
  }

  /**
   * Updates state to nextState, computes RFC 6902 diff operations,
   * advances version number, and returns the operations.
   */
  public updateAndDiff(nextState: Record<string, any>): {
    ops: JsonPatchOperation[];
    baseVersion: number;
    targetVersion: number;
  } {
    const baseVersion = this.version;
    const diff = compare(this.currentState, nextState);
    const ops: JsonPatchOperation[] = diff.map((d: Operation) => ({
      op: d.op as JsonPatchOperation["op"],
      path: d.path,
      value: (d as any).value,
      from: (d as any).from,
    }));

    this.currentState = JSON.parse(JSON.stringify(nextState));
    this.version += 1;

    return {
      ops,
      baseVersion,
      targetVersion: this.version,
    };
  }

  /**
   * Directly applies an RFC 6902 patch onto current state.
   */
  public applyDelta(ops: JsonPatchOperation[]): { state: Record<string, any>; version: number } {
    const patched = applyPatch(this.currentState, ops as Operation[]);
    this.currentState = patched.newDocument;
    this.version += 1;
    return {
      state: JSON.parse(JSON.stringify(this.currentState)),
      version: this.version,
    };
  }
}
