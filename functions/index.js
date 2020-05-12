const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});
const webpush = require('web-push');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var serviceAccount = require("./pwagram-fb-key.json");

admin.initializeApp({
   databaseURL: 'https://pwagram-64b75.firebaseio.com/',
    credential: admin.credential.cert(serviceAccount)
});

exports.storePostData = functions.https.onRequest((request, response) => {
 cors(request, response, function() {
  admin.database().ref('posts').push({
   id: request.body.id,
   title: request.body.title,
   location: request.body.location,
   image: request.body.image
  })
      .then(function() {
          webpush.setVapidDetails('mailto:katerina.holodna@gmail.com',
              'BDyrHTQRPgbkZpQaX90QSY0wflxpAiVYbJAd87-GcwaNowcJ1l2Me5WSaXvyragZ1Rf_v6QT25gt-azoVC4r_oc',
              'dVmidVagqmZuZ1jfr1H258DAErtdficIN_tURjbljvo');
          return admin.database().ref('subscriptions').once('value');
      })
      .then(function(subscriptions) {
          subscriptions.forEach(function(sub) {
              var pushConfig = {
                  endpoint: sub.val().endpoint,
                  keys: {
                      auth: sub.val().keys.auth,
                      p256dh: sub.val().keys.p256dh
                  }
              };
              webpush.sendNotification(pushConfig, JSON.stringify({
                  title: 'New Post',
                  content: 'New Post Added!',
                  openUrl: '/help'
              }))
                  .catch(function(err) {
                      console.log(err);
                  });
          });
          response.status(201).json({
              message: 'Data stored',
              id: request.body.id
          });
      })
      .catch(function (err) {
        response.status(500).json({
          error: err
        });
      });
 })
});
