import * as fs from "fs";
import dotenv from "dotenv";
import { Collection, MongoClient } from "mongodb";
import xmlEscape from "xml-escape";

// nodebb documentation
// https://docs.nodebb.org/development/database-structure/

// mediawiki documentation
// https://www.mediawiki.org/wiki/Help:Export

const DB_NAME = "nodebb";
const DB_COLLECTION_CATEGORIES = "objects";
const exportBase = "./data";

const topicMigrated =
  "This forum post was migrated to the Signal Cartel Wiki and can be found via this link";

const inactiveCategories = [
  5, 9, 12, 15, 21, 33, 41, 43, 44, 37, 46, 31, 18, 34, 40,
];
const mediaWikiNamespace = new Map<number, number>();

async function main() {
  dotenv.config();

  // initialize the mapping from category id to mediawiki namespace
  mediaWikiNamespace.set(1, 120);
  mediaWikiNamespace.set(2, 120);
  mediaWikiNamespace.set(6, 120);
  mediaWikiNamespace.set(7, 120);
  mediaWikiNamespace.set(10, 120);
  mediaWikiNamespace.set(11, 120);
  mediaWikiNamespace.set(13, 120);
  mediaWikiNamespace.set(14, 120);
  mediaWikiNamespace.set(16, 120);
  mediaWikiNamespace.set(17, 120);
  mediaWikiNamespace.set(19, 120);
  mediaWikiNamespace.set(20, 120);
  mediaWikiNamespace.set(22, 120);
  mediaWikiNamespace.set(23, 120);
  mediaWikiNamespace.set(24, 120);
  mediaWikiNamespace.set(25, 120);
  mediaWikiNamespace.set(26, 120);
  mediaWikiNamespace.set(27, 120);
  mediaWikiNamespace.set(28, 120);
  mediaWikiNamespace.set(29, 120);
  mediaWikiNamespace.set(30, 120);
  mediaWikiNamespace.set(32, 120);
  mediaWikiNamespace.set(35, 120);
  mediaWikiNamespace.set(36, 120);
  mediaWikiNamespace.set(38, 120);
  mediaWikiNamespace.set(39, 120);
  mediaWikiNamespace.set(42, 120);
  mediaWikiNamespace.set(45, 120);

  if (!fs.existsSync(exportBase)) {
    console.log(`ERROR: Directory ${exportBase} does not exist.`);
    process.exit(1);
  }

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
    const categoryCollection: Collection = db.collection(
      DB_COLLECTION_CATEGORIES,
    );
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

    // we gather all content in one file for experimenting with markdown conversion
    let writeContent = fs.createWriteStream(`${exportBase}/content.txt`, {
      encoding: "utf8",
    });

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

      let writeXml = fs.createWriteStream(`${exportBase}/${category.cid}.xml`, {
        encoding: "utf8",
      });

      writeXml.write('<mediawiki xml:lang="en">\n');
      const namespaceId = mediaWikiNamespace.get(category.cid);
      if (!namespaceId) {
        console.log(
          `ERROR: namespace for category id ${category.cid} is not defined.`,
        );
        console.log(category);
        process.exit(1);
      }

      // Find all topics
      const topics = await topicCollection
        .find({ cid: { $eq: category.cid }, _key: { $regex: /^topic:/ } })
        .sort({ timestamp: 1 })
        .toArray();
      for (const topic of topics) {
        console.log(`  - Topic: ${topic.title}`);

        const tsTopic = new Date(topic.timestamp).toISOString();
        const username = userCache[topic.uid].username;
        let content = "";

        let page = `  <page>\n`;
        page += `    <title>${topic.title}</title>\n`;
        page += `    <ns>${namespaceId}</ns>\n`;
        page += `    <revision>\n`;
        page += `      <timestamp>${tsTopic}</timestamp>\n`;
        page += `      <contributor><username>${username}</username></contributor>\n`;

        // Find all posts
        const posts = await postCollection
          .find({
            tid: { $eq: topic.tid },
            _key: { $regex: /^post:/ },
            deleted: { $eq: 0 },
          })
          .sort({ timestamp: 1 })
          .toArray();
        for (const post of posts) {
          const tsPost = new Date(post.timestamp).toISOString();

          content += `'''${userCache[post.uid].username}''' ${tsPost}\n`;
          content += `${post.content}\n`;
          content += "----\n";
        }

        content += `''https://forums.eve-scout.com/topic/${topic.slug}''\n`;

        const xmlContent = xmlEscape(content);
        page += `      <text>${xmlContent}</text>\n`;
        page += `    </revision>\n`;
        page += `  </page>\n`;

        if (!page.includes(topicMigrated)) {
          writeContent.write(
            `== TOPIC: ${topic.title} ==\n${content}\n----\n----\n\n\n\n`,
          );
          writeXml.write(page);
        } else {
          console.log("    SKIP!");
        }
      }

      writeXml.write("</mediawiki>\n");
      writeXml.end();
    }

    writeContent.end();
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

main().catch(console.error);
