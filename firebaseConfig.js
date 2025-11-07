require("dotenv").config();
const admin = require("firebase-admin");
const path = require("path");
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(path.join(__dirname, './serviceAccountKey.json')),
});
module.exports = admin;