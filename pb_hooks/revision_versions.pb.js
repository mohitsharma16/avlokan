onRecordCreate((event) => {
  const app = event.app;
  try {
    app.runInTransaction((tx) => {
      const next = new DynamicModel({ version: 0 });
      tx.db().newQuery(
        "SELECT COALESCE(MAX(versionNumber), 0) + 1 AS version FROM assets_revision WHERE asset = {:asset}"
      ).bind({ asset: event.record.getString("asset") }).one(next);

      event.record.set("versionNumber", next.version);
      event.app = tx;
      event.next();
    });
  } finally {
    event.app = app;
  }
}, "assets_revision");
