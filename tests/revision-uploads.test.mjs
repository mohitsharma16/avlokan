import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer as createSocket } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import PocketBase from "pocketbase";
import { createServer } from "vite";

// Run with POCKETBASE_BIN pointing to PocketBase 0.29.1. All records are temporary.
test("concurrent revisions and retries after a lost response", { timeout: 60000 }, async (t) => {
  const binary = process.env.POCKETBASE_BIN || "pocketbase";
  const dir = await mkdtemp(join(tmpdir(), "avlokan-upload-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const password = crypto.randomUUID();
  const common = ["--dir", dir, "--migrationsDir", join(dir, "migrations"), "--automigrate=false", "--hooksDir", resolve("pb_hooks")];
  execFileSync(binary, ["superuser", "upsert", "test@example.org", password, ...common], {
    cwd: dir, stdio: "pipe",
  });
  const socket = createSocket();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const address = `127.0.0.1:${socket.address().port}`;
  await new Promise((resolve) => socket.close(resolve));
  const origin = `http://${address}`;
  const child = spawn(binary, ["serve", `--http=${address}`, ...common], {
    cwd: dir, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const admin = new PocketBase(origin);
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error("PocketBase exited before startup");
      if (await admin.health.check().catch(() => null)) break;
      await delay(50);
    }
    await admin.collection("_superusers").authWithPassword("test@example.org", password);
    const assets = await admin.collections.create({ name: "assets", type: "base" });
    await admin.collections.create({
      name: "assets_revision", type: "base", createRule: "", viewRule: "",
      fields: [
        { name: "asset", type: "relation", collectionId: assets.id, maxSelect: 1, required: true },
        { name: "versionNumber", type: "number", required: true, onlyInt: true, min: 1 },
        { name: "video", type: "file", maxSelect: 1, required: true },
        { name: "title", type: "text" }, { name: "description", type: "text" },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_revision_asset_version ON assets_revision (asset, versionNumber)"],
    });
    const asset = await admin.collection("assets").create({});
    const records = () => admin.collection("assets_revision").getFullList({ sort: "versionNumber" });
    const vite = await createServer({ configFile: false, server: { middlewareMode: true } });
    try {
      const { uploadRevision } = await vite.ssrLoadModule("/app/routes/services/uploadRevision.ts");
      const stored = new Map();
      Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
        removeItem: (key) => stored.delete(key),
      } });
      const video = new File(["synthetic video"], "clip.mp4", { type: "video/mp4" });
      const first = new PocketBase(origin);
      const second = new PocketBase(origin);
      const upload = (client, title) => uploadRevision(client, asset.id, title, "", video);
      await upload(first, "First");
      await Promise.all([upload(first, "Concurrent A"), upload(second, "Concurrent B")]);
      assert.deepEqual((await records()).map((r) => r.versionNumber), [1, 2, 3]);

      // The server commits the file and record, but the client never receives the reply.
      first.beforeSend = (url, options) => {
        if (options.method === "POST") options.fetch = async (...args) => {
          const response = await fetch(...args);
          assert.equal(response.status, 200);
          await response.arrayBuffer();
          throw new Error("Simulated response loss");
        };
        return { url, options };
      };
      await assert.rejects(upload(first, "Interrupted"));
      first.beforeSend = null;
      await upload(first, "Interrupted");
      const rows = await records();
      assert.deepEqual(rows.map((r) => r.versionNumber), [1, 2, 3, 4]);
      assert.equal(rows.filter((r) => r.title === "Interrupted").length, 1);
      assert.ok(rows.every((r) => r.asset === asset.id && r.video));
      assert.equal(await (await fetch(admin.files.getURL(rows[3], rows[3].video))).text(), "synthetic video");
      await upload(first, "Interrupted");
      assert.equal((await records()).length, 5, "a confirmed upload may be intentionally repeated");

      first.beforeSend = (url, options) => {
        if (options.method === "POST") throw new Error("Simulated disconnect before send");
        return { url, options };
      };
      await assert.rejects(upload(first, "Disconnected"));
      assert.equal((await records()).length, 5);
      first.beforeSend = null;
      await upload(first, "Disconnected");
      assert.deepEqual((await records()).map((r) => r.versionNumber), [1, 2, 3, 4, 5, 6]);

      const other = await admin.collection("assets").create({});
      await uploadRevision(second, other.id, "Another asset", "", video);
      assert.equal((await records()).find((r) => r.asset === other.id)?.versionNumber, 1);
    } finally {
      await vite.close();
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  }
});
