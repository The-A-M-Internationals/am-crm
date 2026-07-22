const admin = require("firebase-admin");
const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");
const projectId = env.match(/FIREBASE_PROJECT_ID="(.*?)"/)[1];
const clientEmail = env.match(/FIREBASE_CLIENT_EMAIL="(.*?)"/)[1];
let privateKey = env.match(/FIREBASE_PRIVATE_KEY="(.*?)"/)[1];
privateKey = privateKey.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

const db = admin.firestore();

async function run() {
  const proposals = await db.collection("proposals").where("status", "==", "accepted").get();
  let count = 0;
  for (const doc of proposals.docs) {
    const data = doc.data();
    if (!data.clientId && data.clientEmail) {
      const email = data.clientEmail.trim().toLowerCase();
      const clients = await db.collection("clients").where("email", "==", email).get();
      if (!clients.empty) {
        const client = clients.docs[0];
        await doc.ref.update({ clientId: client.id });
        console.log(`Updated proposal ${doc.id} with clientId ${client.id}`);
        count++;
      }
    }
  }
  console.log(`Backfilled ${count} proposals.`);
  process.exit(0);
}

run().catch(console.error);
