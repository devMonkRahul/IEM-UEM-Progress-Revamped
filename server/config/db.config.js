import mongoose from "mongoose";
import { config } from "../constants.js";
import SchemaMeta from "../models/tableSchema.model.js"; // Use ES module syntax

const connectDB = async () => {
  try {
    if (!config.uri) {
      throw new Error("Database URI is missing in config.");
    }

    await mongoose.connect(config.uri);

    console.log("MongoDB connection SUCCESS");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const typeMapping = {
    String: String,
    Number: Number,
    Boolean: Boolean,
    ObjectId: mongoose.Schema.Types.ObjectId,
  };
  
  const loadSchemas = async () => {
    try {
      const schemas = await SchemaMeta.find();
  
      schemas.forEach(({ tableName, schemaDefinition }) => {
        const sanitizedTableName = tableName.replace(/\s+/g, "_").toLowerCase();
  
        const parsedSchema = {};
  
        Object.keys(schemaDefinition).forEach((key) => {
          let field = schemaDefinition[key];
  
          if (typeof field === "object" && field !== null) {
            let newField = { ...field };
  
            // Convert stored type string to actual Mongoose Type
            if (typeof field.type === "string" && typeMapping[field.type]) {
              newField.type = typeMapping[field.type];
            }
  
            // Ensure ObjectId references are correctly set
            if (field.ref) {
              newField.type = mongoose.Schema.Types.ObjectId;
              newField.ref = field.ref;
            }
  
            parsedSchema[key] = newField;
          }
        });
  
        // Check if the model is already registered
        if (!mongoose.modelNames().includes(sanitizedTableName)) {
          console.log(`Loading schema for: ${sanitizedTableName}`);
        //   console.log(parsedSchema);
  
          const dynamicSchema = new mongoose.Schema(parsedSchema, { timestamps: true });
          mongoose.model(sanitizedTableName, dynamicSchema);
        }
      });
  
      console.log("✅ All schemas dynamically loaded from database");
    } catch (error) {
      console.error("❌ Error loading schemas:", error);
    }
  };
  



// Connect to DB and load schemas
const initializeDatabase = async () => {
    await connectDB(); // Ensure DB connection
  
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected. Loading schemas...");
      await loadSchemas();
    } else {
      mongoose.connection.once("open", async () => {
        console.log("MongoDB connection established. Loading schemas...");
        await loadSchemas();
      });
    }
  };
  

export default initializeDatabase;
