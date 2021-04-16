/* eslint-disable eol-last */
/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
const functions = require("firebase-functions");
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();

// eslint-disable-next-line max-len
exports.getUserByEmail = functions.https.onRequest((request, response, next) => {
    // Grab the email query.
    const email = request.query.email;
    // retrieve user by email
    admin.auth().getUserByEmail(email).then((userResponse) => {
        response
            .set("Access-Control-Allow-Origin", "*")
            .status(200).json({
                user: userResponse,
            });
    }).catch((err) => {
        response.status(500).json({
            message: err.message,
        });
    });
});

// eslint-disable-next-line max-len
exports.getUserById = functions.https.onRequest((request, response, next) => {
    // Grab the id query.
    const id = request.query.uid;
    // retrieve user by id
    admin.auth().getUser(id).then((userResponse) => {
        response
            .set("Access-Control-Allow-Origin", "*")
            .status(200).json({
                user: userResponse,
            });
    }).catch((err) => {
        response.status(500).json({
            message: err.message,
        });
    });
});

// eslint-disable-next-line max-len
exports.createUser = functions.https.onRequest((request, response, next) => {
    // create user
    admin.auth()
        .createUser(request.body).then((userResponse) => {
            response
                .set("Access-Control-Allow-Origin", "*")
                // eslint-disable-next-line max-len
                .set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
                // eslint-disable-next-line max-len
                .set("Access-Control-Allow-Headers", "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization")
                // eslint-disable-next-line max-len
                .set("Access-Control-Expose-Headers", "Content-Length,Content-Range")
                .status(200).json({
                    userId: userResponse.uid,
                });
        }).catch((err) => {
            response.status(500).json({
                message: err.message,
            });
        });
});

// eslint-disable-next-line max-len
exports.updateUser = functions.https.onRequest((request, response, next) => {
    // create user
    admin.auth()
        .updateUser(request.query.uid, request.body).then((userResponse) => {
            response
                .set("Access-Control-Allow-Origin", "*")
                .status(200).json({
                    user: userResponse,
                });
        }).catch((err) => {
            response.status(500).json({
                message: err.message,
            });
        });
});

// eslint-disable-next-line max-len
exports.deleteUser = functions.https.onRequest((request, response, next) => {
    // create user
    admin.auth()
        .deleteUser(request.query.uid).then(() => {
            response
                .set("Access-Control-Allow-Origin", "*")
                .status(200).json({
                    message: "Successfully deleted user",
                });
        }).catch((err) => {
            response.status(500).json({
                message: err.message,
            });
        });
});

// eslint-disable-next-line max-len
exports.getAllUsers = functions.https.onRequest((request, response) => {
    const nextPageToken = request.query.nextPageToken;
    admin
        .auth()
        .listUsers(1000, nextPageToken)
        .then((listUsersResult) => {
            response
                .set("Access-Control-Allow-Origin", "*")
                .status(200)
                .json(listUsersResult);
        }).catch((err) => {
            response.status(500).json({
                message: err.message,
            });
        });
});

exports.addAdminRole = functions.https.onCall((data, context) => {
    // check request is made by an admin
    if (context.auth.token.admin !== true) {
        return { error: "only admin can do this action, sucker" };
    }
    // get user and add custom claim (admin)
    return admin.auth().getUserByEmail(data.email).then((user) => {
        return admin.auth().setCustomUserClaims(user.uid, {
            admin: true,
        });
    }).then(() => {
        return {
            message: `Success! ${data.email} has been made an admin`,
        };
    }).catch((err) => {
        return err;
    });
});

exports.addClientRole = functions.https.onCall((data, context) => {
    // get user and add custom claim (client)
    return admin.auth().getUserByEmail(data.email).then((user) => {
        return admin.auth().setCustomUserClaims(user.uid, {
            client: true,
        });
    }).then(() => {
        return {
            message: `Success! ${data.email} has been made an client`,
        };
    }).catch((err) => {
        return err;
    });
});

exports.addProRole = functions.https.onCall((data, context) => {
    // get user and add custom claim (pro)
    return admin.auth().getUserByEmail(data.email).then((user) => {
        return admin.auth().setCustomUserClaims(user.uid, {
            pro: true,
        });
    }).then(() => {
        return {
            message: `Success! ${data.email} has been made an pro`,
        };
    }).catch((err) => {
        return err;
    });
});