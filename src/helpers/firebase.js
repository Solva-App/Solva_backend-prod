const storage = require('@firebase/storage')
const messaging = require('@firebase/messaging')
const app = require('@firebase/app')
const firebaseKeys = require('../../firebaseConfig')

const CustomError = require('./error')

app.initializeApp(firebaseKeys.storage)

const bucket = storage.getStorage()

module.exports.fileUpload = async function (file, location) {
  try {
    const metadata = { contentType: file.mimetype }
    const ref = storage.ref(bucket, `${location}/${Math.round(Math.random() * 1e9)}-${file.originalname} `)
    const snapshort = await storage.uploadBytes(ref, file.buffer, metadata)
    return await storage.getDownloadURL(snapshort.ref)
  } catch (error) {
    console.log(error)
    return CustomError.internalServerError('Something went wrong', error)
  }
}

// module.exports.sendNotification = async (token, { title, body, data }) => {
//   try {
//     const response = await messaging.sendToToken(token, {
//       data,
//       notification: {
//         title,
//         body
//       }
//     })
//     return response
//   } catch (error) {
//     console.log(error)
//     return CustomError.internalServerError('Something went wrong', error)
//   }
// }


// module.exports.getNotificationToken = async function () {
//   try {
//     const messaging = getMessaging()
//     const permission = await messaging.requestPermission()
//     if (permission === 'granted') {
//       await messaging.usePublicVapidKey(firebaseKeys.messaging.publicVapidKey)
//       const token = await getToken(messaging, { vapidKey: firebaseKeys.messaging.publicVapidKey })
//       return token
//     } else {
//       return CustomError.badRequest('Notification permission denied')
//     }
//   } catch (error) {
//     console.log(error)
//     return CustomError.internalServerError('Something went wrong', error)
//   }
// }

// module.exports.handleBackgroundMessage = function (payload) {
//   console.log('Received background message: ', payload);
//   const notificationTitle = payload.notification.title;
//   const notificationOptions = {
//     body: payload.notification.body,
//     icon: payload.notification.icon,
//   };

//   self.registration.showNotification(notificationTitle, notificationOptions);
// }


/**
 * To use firebase cloud messaging, you need to have a service worker
 * in your frontend, you can get the token using the following code
 * 
 * const messaging = firebase.messaging();
 * messaging
 *   .requestPermission()
 *   .then(() => messaging.getToken())
 *   .then((token) => {
 *     // send token to server
 *   })
 *   .catch((err) => {
 *     console.log('Unable to get permission to notify.', err);
 *   });
 * 
 * Then in your server, you can use the following function to send a message
 * 
 * const sendNotification = async (token, { title, body, data }) => {
 *   try {
 *     const response = await messaging.sendToToken(token, {
 *       data,
 *       notification: {
 *         title,
 *         body
 *       }
 *     })
 *     return response
 *   } catch (error) {
 *     console.log(error)
 *     return CustomError.internalServerError('Something went wrong', error)
 *   }
 * }
 * 
 * You can then call the function like this:
 * 
 * const result = await sendNotification(token, {
 *   title: 'Hello',
 *   body: 'This is a notification',
 *   data: {
 *     foo: 'bar'
 *   }
 * })
 * console.log(result)
 */



