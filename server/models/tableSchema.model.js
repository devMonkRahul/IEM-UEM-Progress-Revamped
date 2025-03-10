import mongoose, { Schema } from "mongoose";

const tableSchema = new Schema({
    tableName: {
        type: String,
        required: true
    },
    tableFields: [{
        FieldName: {
            type: String,
        },
        FieldType: {
            type: String,
        },
        FieldSize: {
            type: String,
        },
        FieldRequired: {
            type: String,
        },
        FieldUnique: {
            type: String,
        },
        Placeholder: {
            type: String,
        },
        Value : {
            type: String,
        },
    }]
});

const TableSchema = mongoose.model("TableSchema", tableSchema);

export default TableSchema;