/* eslint-disable eol-last */
/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
const express = require("express");
const app = express();

const functions = require("firebase-functions");
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();

const cors = require("cors")({ origin: true });
app.use(cors);

// eslint-disable-next-line max-len
exports.getUserByEmail = functions.https.onRequest((request, response, next) => {
    try {
        // Grab the email query.
        const email = request.query.email;
        // retrieve user by email
        admin.auth().getUserByEmail(email).then((userResponse) => {
            response.status(200).json({
                user: userResponse,
            });
        });
    } catch (error) {
        response.status(500).json({
            message: error.message,
        });
    }
});

// eslint-disable-next-line max-len
exports.getUserById = functions.https.onRequest((request, response, next) => {
    try {
        // Grab the id query.
        const id = request.query.uid;
        // retrieve user by id
        admin.auth().getUser(id).then((userResponse) => {
            response.status(200).json({
                user: userResponse,
            });
        });
    } catch (error) {
        response.status(500).json({
            message: error.message,
        });
    }
});

// eslint-disable-next-line max-len
exports.createUser = functions.https.onRequest((request, response, next) => {
    try {
        // create user
        admin.auth()
            .createUser(request.body).then((userResponse) => {
                response.status(200).json({
                    userId: userResponse.uid,
                });
            });
    } catch (error) {
        response.status(500).json({
            message: error.message,
        });
    }
});