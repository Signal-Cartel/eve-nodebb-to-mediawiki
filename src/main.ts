import { Collection, MongoClient } from "mongodb";
import dotenv from "dotenv";

const DB_NAME = "nodebb";
const DB_COLLECTION_CATEGORIES = "objects";

const inactiveCategories = [5, 12, 21, 33, 41, 43, 44, 37, 46, 31, 18, 34, 40];

async function main() {
  dotenv.config();

  const uri = process.env.MONGODB_URI;
  if (uri == undefined) {
    console.log("No MONGODB_URI configured.");
    return;
  }
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db(DB_NAME);
    const collection: Collection = db.collection(DB_COLLECTION_CATEGORIES);

    console.log("Creating indexes");
    console.log("   - _key");
    await collection.createIndex({ _key: 1 });
    console.log("   - uid");
    await collection.createIndex({ uid: 1 });
    console.log("   - cid");
    await collection.createIndex({ cid: 1 });
    console.log("   - tid");
    await collection.createIndex({ tid: 1 });
    console.log("   - pid");
    await collection.createIndex({ pid: 1 });
    console.log("   - mid");
    await collection.createIndex({ mid: 1 });

    //  .find({ _key: { $regex: /^collection:/ } })
    // Find all categories
    await collection
      .find({ _key: { $regex: /^category:/ } })
      .toArray()
      .then((categories) => {
        console.log("categories:");
        categories.forEach(async (obj) => {
          if (inactiveCategories.includes(obj.cid)) {
            // Skip to the next object
            return;
          }
          console.log(`${obj.cid}: ${obj.name}`);

          // Find all topics
          await collection
            .find({ cid: { $eq: obj.cid }, _key: { $regex: /^topic:/ } })
            .toArray()
            .then(async (topics) => {
              console.log(topics);
            });
        });
      });
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

main().catch(console.error);
