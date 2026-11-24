migrate((app) => {
  const assets = app.findCollectionByNameOrId("assets");
  const revisions = app.findCollectionByNameOrId("assets_revision");
  if (revisions.fields.getByName("asset") || revisions.fields.getByName("versionNumber")) {
    throw new Error("Revision version fields already exist. Reconcile the existing schema before migration.");
  }

  revisions.fields.add(new RelationField({ name: "asset", collectionId: assets.id, required: true, maxSelect: 1 }));
  revisions.fields.add(new NumberField({ name: "versionNumber", required: true, onlyInt: true, min: 1 }));
  app.save(revisions);

  const owners = new Set();
  for (const asset of app.findAllRecords(assets)) {
    const ids = asset.getStringSlice("revision_assets");
    ids.forEach((id, index) => {
      if (owners.has(id)) throw new Error("Revision " + id + " has multiple legacy links. Resolve its parent before migration.");
      owners.add(id);
      // Updating only these columns preserves revision timestamps and file metadata.
      app.db().newQuery("UPDATE assets_revision SET asset = {:asset}, versionNumber = {:version} WHERE id = {:id}")
        .bind({ asset: asset.id, version: index + 1, id }).execute();
    });
  }
  const unowned = app.findRecordsByFilter(revisions, "asset = ''", "", 1, 0);
  if (unowned.length) throw new Error("Revision " + unowned[0].id + " has no legacy parent. Link it to the correct asset before migration.");

  revisions.addIndex("idx_revision_asset_version", true, "asset, versionNumber", "");
  app.save(revisions);
}, (app) => {
  const revisions = app.findCollectionByNameOrId("assets_revision");
  // Rebuild legacy lists so uploads made after migration survive a rollback.
  for (const asset of app.findAllRecords("assets")) {
    const records = app.findRecordsByFilter(revisions, "asset = {:asset}", "versionNumber", 0, 0, { asset: asset.id });
    asset.set("revision_assets", records.map((record) => record.id));
    app.save(asset);
  }
  revisions.removeIndex("idx_revision_asset_version");
  revisions.fields.removeByName("asset");
  revisions.fields.removeByName("versionNumber");
  app.save(revisions);
});
