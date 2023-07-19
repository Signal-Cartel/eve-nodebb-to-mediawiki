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
    const userCollection: Collection = db.collection(DB_COLLECTION_CATEGORIES);
    const categoryCollection: Collection = db.collection(DB_COLLECTION_CATEGORIES);
    const topicCollection: Collection = db.collection(DB_COLLECTION_CATEGORIES);
    const postCollection: Collection = db.collection(DB_COLLECTION_CATEGORIES);

    console.log("Creating indexes");
    console.log("   - _key");
    await categoryCollection.createIndex({ _key: 1 });
    console.log("   - uid");
    await categoryCollection.createIndex({ uid: 1 });
    console.log("   - cid");
    await categoryCollection.createIndex({ cid: 1 });
    console.log("   - tid");
    await categoryCollection.createIndex({ tid: 1 });
    console.log("   - pid");
    await categoryCollection.createIndex({ pid: 1 });
    console.log("   - mid");
    await categoryCollection.createIndex({ mid: 1 });

    // Find all users
    const userCache = [];
    const users = await userCollection
      .find({ _key: { $regex: /^user:/ }, uid: { $exists: true } })
      .toArray();
    for (const user of users) {
      userCache[user.uid] = user;
    }

    // Find all categories
    console.log("categories:");
    const categories = await categoryCollection
      .find({ _key: { $regex: /^category:/ } })
      .toArray();
    for (const category of categories) {
      if (inactiveCategories.includes(category.cid)) {
        // Skip to the next object
        continue;
      }
      console.log(`${category.cid}: ${category.name}`);

      // Find all topics
      const topics = await topicCollection
        .find({ cid: { $eq: category.cid }, _key: { $regex: /^topic:/ } })
        .sort({ timestamp: 1 })
        .toArray();
      for (const topic of topics) {
        console.log(`  - Topic: ${topic.title}`);

        // Find all posts
        const posts = await postCollection
          .find({ tid: { $eq: topic.tid }, _key: { $regex: /^post:/ } })
          .sort({ timestamp: 1 })
          .toArray();
        for (const post of posts) {
          console.log(`    - Post: ${userCache[post.uid].username}`);
        }
      }
    }
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

main().catch(console.error);
