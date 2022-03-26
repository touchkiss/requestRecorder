chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action == 'ajax') {
            var url = BASE_URL + request.url;
            fetch(url)
                .then(response => response.text())
                .then(result => sendResponse && sendResponse(result))
                .catch(error => console.log(error))
            return true;  // Will respond asynchronously.
        }
    });


