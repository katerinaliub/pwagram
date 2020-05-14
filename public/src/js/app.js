var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

if (!window.Promise) {
    window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/service-worker.js')
        .then(function () {
            console.log('SW registered');
        })
        .catch(function (err) {
            console.log(err);
        });
}

window.addEventListener('beforeinstallprompt', function (event) {
    console.log('beforeinstallprompt fired');
    event.preventDefault();
    deferredPrompt = event;
    return false;
});

function displayConfirmNotification() {
    if ('serviceWorker' in navigator) {
        var options = {
            body: 'You successfully subscribed on our Notification service!',
            icon: '/src/images/icons/app-icon-96x96.png',
            image: './src/images/sf-boat.jpg',
            dir: 'ltr',
            lang: 'en-US', //BCP 47
            vibrate: [100, 50, 200],
            badge: 'src/images/icons/app-icon-96x96.png',
            tag: 'confirm-notification',
            renotify: true,
            actions: [
                { action: 'confirm', title: 'Okay', icon: 'src/images/icons/app-icon-96x96.png'},
                { action: 'cancel', title: 'Cancel', icon: 'src/images/icons/app-icon-96x96.png'}
            ]
        };
        navigator.serviceWorker.ready
            .then(function (swreg) {
                swreg.showNotification('Successfully subscribed!', options);
            });
    }
}

function configurePushSub() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    var reg;
    navigator.serviceWorker.ready
        .then(function (swreg) {
            reg = swreg;
            return swreg.pushManager.getSubscription()
        })
        .then(function (sub) {
            if (sub === null) {
                //create a new subscription
                var vapidPublicKey = 'BDyrHTQRPgbkZpQaX90QSY0wflxpAiVYbJAd87-GcwaNowcJ1l2Me5WSaXvyragZ1Rf_v6QT25gt-azoVC4r_oc';
                var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
                return reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidPublicKey
                });
            } else {
                //we have a subscription
            }
        })
        .then(function (newSub) {
            return fetch('https://pwagram-64b75.firebaseio.com/subscriptions.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(newSub)
            })
        })
        .then(function (res) {
            if (res.ok) {
                displayConfirmNotification();
            }
        })
        .catch(function (err) {
            console.log(err);
        });
}

function askForNotificationPermission(event) {
    Notification.requestPermission(function (result) {
        console.log('User choice', result);
        if (result !== 'granted') {
            console.log('No notification permission granted');
        } else {
            configurePushSub();
            // displayConfirmNotification();
        }
    })
}

if ('Notification' in window && 'serviceWorker' in navigator) {
    for (var i = 0; i < enableNotificationsButtons.length; i++) {
        enableNotificationsButtons[i].style.display = 'inline-block';
        enableNotificationsButtons[i].addEventListener('click', askForNotificationPermission);
    }
}