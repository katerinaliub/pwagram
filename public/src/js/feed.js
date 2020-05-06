var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');

function openCreatePostModal() {
  // createPostArea.style.display = 'block';
  // setTimeout(function () {
    createPostArea.style.transform = 'translateY(0)';
  // }, 1);
  if (deferredPrompt) {
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(function(choiceResult) {
      console.log(choiceResult.outcome);

      if (choiceResult.outcome === 'dismissed') {
        console.log('User cancelled installation');
      } else {
        console.log('User added to home screen');
      }
    });

    deferredPrompt = null;
  }


//Service Worker unregistering
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker.getRegistrations()
  //       .then(function (registrations) {
  //         for (var i = 0; i < registrations.length; i++) {
  //           registrations[i].unregister();
  //         }
  //       });
  // }
}

function closeCreatePostModal() {
  createPostArea.style.transform = 'translateY(100vh)';
  // createPostArea.style.display = 'none';
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);


//Currently bot in use, allows to save assets cache on demand otherwise
function onSaveButtonClicked(event) {
  console.log('Clicked');
  if ('caches' in window) {
    caches.open('user-requested')
        .then(function (cache) {
          cache.add('https://httpbin.org/get');
          cache.add('/src/images/sf-boat.jpg');
        })
  }
}

function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

function createCard(data) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = 'url(' + data.image + ')';
  cardTitle.style.backgroundSize = 'cover';
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'white';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';
  // var cardSaveButton = document.createElement('button');
  // cardSaveButton.textContent = 'Save';
  // cardSaveButton.addEventListener('click', onSaveButtonClicked);
  // cardSupportingText.appendChild(cardSaveButton);
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

function updateUI(data) {
  clearCards();
  for (var i = 0; i < data.length; i++) {
    createCard(data[i]);
  }
}

var url = 'https://pwagram-64b75.firebaseio.com/posts.json';
var networkDataReceived = false;

fetch(url)
    .then(function(res) {
      return res.json();
    })
    .then(function(data) {
      networkDataReceived = true;
      console.log('From Web', data);
      var dataArr = [];
      for (var key in data) {
        dataArr.push(data[key]);
      }
      updateUI(dataArr);
    });

if ('indexedDB' in window) {
  readAllData('posts')
      .then(function (data) {
        if (!networkDataReceived) {
          console.log('From Cache', data);
          updateUI(data);
        }
      });
}

function sendData() {
  fetch('https://us-central1-pwagram-64b75.cloudfunctions.net/storePostData', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
      },
      body: JSON.stringify({
          id: new Date().toISOString(),
          title: titleInput.value,
          location: locationInput.value,
          image: "https://firebasestorage.googleapis.com/v0/b/pwagram-64b75.appspot.com/o/sf-boat.jpg?alt=media&token=2caa6d2a-1788-4f2a-a978-4962ea20712b"
      })
  })
  .then(function (res) {
    console.log('Sent Data: ', res);
    // updateUI();
  })
      .catch(function (err) {
          console.log('Send Data Error', err);
      })
}


form.addEventListener('submit', function (event) {
  event.preventDefault();
  if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
    alert('Please enter valid data!');
    return;
  }
  closeCreatePostModal();

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
        .then(function (sw) {
          var post = {
            id: new Date().toISOString(),
            title: titleInput.value,
            location: locationInput.value
          };
          writeData('sync-posts', post)
              .then(function () {
                sw.sync.register('sync-new-post');
              })
              .then(function () {
                var snackbarContainer = document.querySelector('#confirmation-toast');
                var data = {message: 'Your post was saved for syncing!'};
                snackbarContainer.MaterialSnackbar.showSnackbar(data);
              })
              .catch(function (err) {
                console.log(err);
              });
        });
  } else {
    sendData();
  }
});

