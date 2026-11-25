migrate((app) => {
  const annotations = app.findCollectionByNameOrId("annotations");
  const timestamp = annotations.fields.getByName("timestamp");
  // PocketBase treats zero as empty for required number fields.
  timestamp.required = false;
  timestamp.min = 0;
  app.save(annotations);
}, (app) => {
  const annotations = app.findCollectionByNameOrId("annotations");
  const timestamp = annotations.fields.getByName("timestamp");
  timestamp.required = true;
  timestamp.min = null;
  app.save(annotations);
});
