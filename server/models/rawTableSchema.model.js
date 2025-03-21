import { Schema, model } from "mongoose";

const rawSchemaMetaSchema = new Schema({
  tableName: { type: String, required: true, unique: true },
  schemaDefinition: { type: Object, required: true },
});

const RawSchemaMeta = model("RawSchemaMeta", rawSchemaMetaSchema);

export default RawSchemaMeta;
