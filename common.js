/**
 * Shared code for interacting with the GitHub API.
 *
 * Exposes two magic-named hooks:
 *
 * - process(searchValue, username): Execute a search.
 * - setup(): Optional. Execute code when the page loads.
 */

// Get the client ID and secret from the URL if they're not provided in config.
// This lets people try the demo.
(function() {
    var matches;
    if (!window.CLIENT_ID) {
        matches = /[?&]client_id=([^&#]+)/.exec(location.search);
        if (matches && matches[1]) {
            window.CLIENT_ID = matches[1];
        }
        else {
            window.CLIENT_ID = '';
        }
    }
    if (!window.CLIENT_SECRET) {
        matches = /[?&]client_secret=([^&#]+)/.exec(location.search);
        if (matches && matches[1]) {
            window.CLIENT_SECRET = matches[1];
        }
        else {
            window.CLIENT_SECRET = '';
        }
    }
})();

var last403 = 0;

/**
 * Request an API resource from GitHub.
 *
 * @param {String} url
 *   The URL to request. The client ID and secret will be appended.
 * @param {Function} callback
 *   A function to execute after the resource is loaded.
 *
 * @return {XMLHttpRequest}
 *   The request object.
 */
function loadAjax(url, callback, complete) {
    url = url + (/\?/g.test(url) ? '&' : '?') + 'client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET;
    var xhr = new XMLHttpRequest(), success = false;
    xhr.onreadystatechange = function () {
        if (xhr.readyState === xhr.DONE) {
            // Request completed successfully
            if (xhr.status === 200 || xhr.status === 0) {
                try {
                    var json = JSON.parse(xhr.responseText);
                    callback(json);
                }
                catch (e) {
                    callback(xhr.responseText);
                }
                success = true;
            }
            // Request was well-formed but couldn't be completed in time
            else if (xhr.status === 202) {
                console.info('Request to ' + url + ' returned 202 Accepted, indicating that GitHub is processing the request asynchronously and could not return immediately. This usually happens for long-running actions like forking a repo or calculating statistics.');
            }
            // Requested repo is empty (204) or still being created (409); ignore
            else if (xhr.status === 204 || xhr.status === 409) {
                console.info('Request to ' + url + ' returned 204 No Content. This usually means the requested repo is empty.');
            }
            // For our uses, 403 usually indicates a rate limiting error
            else if (xhr.status === 403) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    console.error('Request to ' + url + ' denied: ' + response.message);
                    var now = Date.now();
                    if (now - last403 > 3000) {
                        last403 = now;
                        alert(response.message);
                    }
                }
                catch (e) {
                    console.error('Request to ' + url + ' denied: ' + xhr.responseText);
                }
            }
            else if (xhr.status > 499) {
                console.error('Request to ' + url + ' failed with code ' + xhr.status + ' because of a server error.');
            }
            // Browsers seem to handle 304 as serving a 200 from the cache.
            // 301, 302, and 307 will automatically be followed.
            // Other known possible status codes:
            // 201 (resource created; we're not doing that here)
            // 205 (notifications marked as read; we're not doing that here)
            // 401 (invalid login)
            // 400 or 422 (invalid request parameters)
            // 404 (hidden data or endpoint does not exist)
            // 405 (merge cannot be performed; we're not doing that here)
            else {
                console.error('Unable to load [' + url + '] [' + xhr.status + ']');
            }
            if (typeof complete === 'function') complete(xhr, success, url);
        }
    };

    xhr.open('GET', url, true);
    xhr.send(null);
    return xhr;
}

/**
 * HTML-escape a string.
 */
function sanitize(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML.replace(/"/g, '&quot;');
}

/**
 * Get the top and left coordinates of a DOM element.
 *
 * Copied from http://stackoverflow.com/a/16752864/843621
 * This is slightly wrong -- see http://stackoverflow.com/q/442404/843621 for
 * correct versions -- but it does the job.
 *
 * @param {HTMLElement} ele
 *   The element for which to get coordinates.
 *
 * @return {Number[]}
 *   A two-element array containing the left and top pixel coordinates of the
 *   relevant element, respectively.
 */
function getPos(ele) {
    var x = 0;
    var y = 0;
    while (true) {
        x += ele.offsetLeft;
        y += ele.offsetTop;
        if (ele.offsetParent === null) {
            break;
        }
        ele = ele.offsetParent;
    }
    return [x, y];
}

/**
 * Execute a search.
 */
function submitSearch(event) {
    if (event) event.preventDefault();
    document.getElementById('search-results').style.display = 'none';
    var searchValue = document.getElementById('username-field').value;
    // Run the process hook.
    process(searchValue, encodeURIComponent(searchValue));
}

window.onload = function() {
    // Insert the correct URL for the current page into the help text.
    document.getElementById('here').textContent = location.href + (/\?/g.test(location.href) ? '&' : '?') + 'client_id=CLIENT_ID&client_secret=CLIENT_SECRET';
    // Hide the help text if we already have the keys.
    if (window.CLIENT_ID && window.CLIENT_SECRET) {
        document.getElementById('info').style.display = 'none';
    }

    // Move the autocomplete results below the search field.
    var elem = document.getElementById('username-field'),
        move = document.getElementById('search-results');
    var o = getPos(elem);
    move.style.position = 'absolute';
    move.style.left = o[0] + 'px';
    move.style.top = (o[1] + elem.offsetHeight) + 'px';

    // If the ?user parameter is in the URL, automatically execute the search.
    var matches = /[?&]user=([^&#]+)/.exec(location.search);
    if (matches && matches[1]) {
        document.getElementById('username-field').value = matches[1];
        submitSearch();
    }

    // Submit the search form.
    document.getElementById('search-form').addEventListener('submit', submitSearch);

    // Get autocomplete results when searching for users.
    var lastTimeout = null,
        lastXHR = null,
        lastInput = '';
    document.getElementById('search-form').addEventListener('keyup', function(event) {
        event.preventDefault();
        var div = document.getElementById('search-results');
        var searchValue = document.getElementById('username-field').value;
        if (searchValue.length < 2) {
            if (lastTimeout) clearTimeout(lastTimeout);
            if (lastXHR && lastXHR.readyState !== lastXHR.DONE) lastXHR.abort();
            div.style.display = 'none';
            return;
        }
        if (searchValue === lastInput) {
            return;
        }
        lastInput = searchValue;
        var username = encodeURIComponent(searchValue);

        if (lastTimeout) clearTimeout(lastTimeout);
        lastTimeout = setTimeout(function() {
            if (lastXHR && lastXHR.readyState !== lastXHR.DONE) lastXHR.abort();
            lastXHR = loadAjax('https://api.github.com/search/users?per_page=10&q=' + username, function(results) {
                var users = [];
                for (var i = 0, l = results.items.length; i < l; i++) {
                    var u = results.items[i], n = sanitize(u.login);
                    users.push('<div class="suggestion" data-name="' + encodeURIComponent(u.login) + '"><img src="' + sanitize(u.avatar_url + 's=16') + '" alt="' + n + '\'s avatar" /><span class="suggest-name">' + n + '</span></div>');
                }
                if (users.length) {
                    div.innerHTML = users.join('');
                    div.style.display = 'block';
                }
                else {
                    div.style.display = 'none';
                }
            });
        }, 250);
    });

    // Execute a search when an autocomplete result is clicked.
    document.getElementById('search-results').addEventListener('click', function(event) {
        event.preventDefault();
        var elem = event.target;
        if (elem && elem.nodeName.toLowerCase() != 'div') {
            elem = elem.parentNode;
        }
        if (elem.nodeName.toLowerCase() == 'div' && ~elem.className.indexOf('suggestion')) {
            document.getElementById('username-field').value = decodeURIComponent(elem.getAttribute('data-name'));
            this.style.display = 'none';
            submitSearch();
        }
    });

    // Run the setup hook if it's available.
    if (typeof setup === 'function') setup();
};
