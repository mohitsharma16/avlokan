import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate as nextTurn } from "node:timers/promises";
import { createServer } from "vite";

test("closing during setup releases only the closed view's listener", async t => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
  t.after(() => vite.close());
  const { subscribeToRecords } = await vite.ssrLoadModule("/app/routes/utils/subscribeToRecords.ts");

  const listeners = new Set();
  const pending = [];
  const collection = {
    subscribe(topic, listener) {
      assert.equal(topic, "*");
      listeners.add(listener);
      return new Promise(resolve => {
        pending.push(() => resolve(async () => assert.ok(listeners.delete(listener))));
      });
    },
  };
  const pb = { collection: () => collection };
  const received = [];
  const closeFirst = subscribeToRecords(pb, "comments", () => received.push("first"));
  closeFirst();
  const closeSecond = subscribeToRecords(pb, "comments", () => received.push("second"));

  for (const listener of listeners) listener({});
  assert.deepEqual(received, ["second"]);
  pending[1]();
  pending[0]();
  await nextTurn();
  assert.equal(listeners.size, 1);
  for (const listener of listeners) listener({});
  assert.deepEqual(received, ["second", "second"]);

  closeSecond();
  await nextTurn();
  assert.equal(listeners.size, 0);
});
