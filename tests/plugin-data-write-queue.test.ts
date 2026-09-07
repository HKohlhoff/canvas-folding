import assert from "node:assert/strict";
import test from "node:test";

import { LatestSnapshotWriteQueue } from "../src/plugin-data-write-queue";

void test("creates a queued snapshot only after earlier rollback completes", async () => {
  const state = new Map([["A", "saved"]]);
  const snapshots: Array<Record<string, string>> = [];
  let rejectFirstWrite: ((error: Error) => void) | undefined;
  const firstWrite = new Promise<void>((_resolve, reject) => {
    rejectFirstWrite = reject;
  });
  let writeCount = 0;
  const queue = new LatestSnapshotWriteQueue(
    () => Object.fromEntries(state),
    async (snapshot) => {
      snapshots.push(snapshot);
      writeCount += 1;
      if (writeCount === 1) await firstWrite;
    },
    () => {},
  );

  state.delete("A");
  const removal = queue.enqueue(true).catch((error: unknown) => {
    state.set("A", "saved");
    throw error;
  });
  await Promise.resolve();

  state.set("B", "new");
  const laterWrite = queue.enqueue(false);
  rejectFirstWrite?.(new Error("simulated save failure"));

  await assert.rejects(removal, /simulated save failure/u);
  await laterWrite;
  assert.deepEqual(snapshots, [
    {},
    { A: "saved", B: "new" },
  ]);
});

void test("continues after a handled background write failure", async () => {
  let shouldFail = true;
  const written: number[] = [];
  const queue = new LatestSnapshotWriteQueue(
    () => written.length + 1,
    async (snapshot) => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("simulated background failure");
      }
      written.push(snapshot);
    },
    () => {},
  );

  await queue.enqueue(false);
  await queue.enqueue(false);

  assert.deepEqual(written, [1]);
});
