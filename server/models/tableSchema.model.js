import { Schema, model } from "mongoose";

const schemaMetaSchema = new Schema({
  tableName: { type: String, required: true, unique: true },
  schemaDefinition: { type: Object, required: true },
});

const SchemaMeta = model("SchemaMeta", schemaMetaSchema);

export default SchemaMeta;
