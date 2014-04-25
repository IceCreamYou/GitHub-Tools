/**
 * Get users who are related to another user on GitHub.
 *
 * TODO: Set up a server to authenticate people for the demo without exposing
 *   my client secret. Resources:
 *   http://developer.github.com/v3/oauth/
 *   https://github.com/prose/gatekeeper
 *   http://fajitanachos.com/Authenticating-with-the-GitHub-API/
 * TODO: Several types of network analysis are currently not performed because
 *   they are too expensive in terms of number of API queries.
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
function loadAjax(url, callback, err) {
  url = url + (/\?/g.test(url) ? '&' : '?') + 'client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET;
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState === xhr.DONE) {
      if (xhr.status === 200 || xhr.status === 0) {
        try {
          var json = JSON.parse(xhr.responseText);
          callback(json);
        }
        catch (e) {
          callback(xhr.responseText);
        }
      }
      else if (xhr.status === 204) {
        console.info('Request to ' + url + ' returned 204 No Content. This usually means the requested repo is empty.');
        err(xhr);
      }
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
        finally {
          err(xhr);
        }
      }
      else {
        console.error('Unable to load [' + url + '] [' + xhr.status + ']');
        if (window.NOISY) {
          alert('Unable to load [' + url + '] [' + xhr.status + ']');
        }
        err(xhr);
      }
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
 * A GitHub user.
 *
 * @param {String} name The GitHub username.
 * @param {String} url The GitHub profile URL.
 * @param {String} type One of `Node.TYPES`.
 */
function Node(name, url, type) {
  this.name = name;
  this.url = url;
  this.types = [type];
}
Node.prototype.equals = function(other) {
  return other && other instanceof Node && other.name == this.name;
};
Node.prototype.value = function() {
  var score = 0;
  for (var i = 0; i < this.types.length; i++) {
    for (var type in Node.TYPES) {
      if (Node.TYPES.hasOwnProperty(type) && this.types[i] == Node.TYPES[type]) {
        score += WEIGHTS[type] || 0;
        break;
      }
    }
  }
  return score;
};
Node.TYPES = {
  FOLLOWS: '%user follows this user',
  FOLLOWER: 'this user follows %user',
  COLLABORATOR: 'shared commit access',
  COLLEAGUE: 'in the same organization',
  CONTRIBUTOR: 'this user contributed to a repo %user maintains',
  CONTRIBUTEE: 'this user maintains a repo %user contributed to',
  ISSUE_PARTICIPANT: 'participated in same issues',
  FOLLOWED_REPO_MAINTAINER: 'maintains a repo %user follows',
  REPO_FOLLOWER: 'follows repos %user maintains',
  // TODO: Add some sort of network analysis (mutual follows)
};

/**
 * A set of {@link Node}s.
 */
function Set(exclude) {
  this.nodes = [];
  this.exclude = exclude;
}
Set.prototype.add = function(node) {
  if (!node || !(node instanceof Node)) return;
  if (this.exclude && node.name === this.exclude) return;
  for (var i = 0, l = this.nodes.length; i < l; i++) {
    if (this.nodes[i].equals(node)) {
      this.nodes[i].types.push(node.types[0]);
      return;
    }
  }
  this.nodes.push(node);
};
Set.prototype.remove = function(node) {
  for (var i = this.nodes.length-1; i >= 0; i--) {
    if (this.nodes[i].equals(node)) {
      this.nodes.splice(i, 1);
    }
  }
};
// Sort by descending "friend" value
Set.prototype.sort = function() {
  this.nodes.sort(function(a, b) {
    return b.value() - a.value();
  });
};
Set.prototype.foreach = function(callback, num) {
  for (var i = 0, l = Math.min(num || Infinity, this.nodes.length); i < l; i++) {
    callback(this.nodes[i]);
  }
};

/**
 * Get the requested user's GitHub connections.
 */
function submitSearch(event) {
  if (event) event.preventDefault();
  document.getElementById('search-results').style.display = 'none';
  var searchValue = document.getElementById('username-field').value;
  var username = encodeURIComponent(searchValue);
  var connections = new Set(searchValue);
  var found = {
    FOLLOWS: false,
    FOLLOWER: false,
    COLLABORATOR: false,
    COLLEAGUE: false,
    CONTRIBUTOR: false,
    //CONTRIBUTEE: false, // (retired; same as collaborator/contributor)
    //ISSUE_PARTICIPANT: false, // (infeasible for now)
    //FOLLOWED_REPO_MAINTAINER: false, // starred_url, subscriptions_url (not a significant source of knowledge)
    //REPO_FOLLOWER: false, // repos -> followers (infeasible for now)
  };
  function checkDone() {
    for (var criteria in found) {
      if (found.hasOwnProperty(criteria)) {
        if (!found[criteria]) {
          return;
        }
      }
    }
    done();
  }
  function done() {
    var output = ['<ul>'];
    connections.sort();
    connections.foreach(function(node) {
      output.push('<li><a href="' + sanitize(node.url) + '" target="_blank">' + sanitize(node.name) + '</a> <span class="why">(' + node.types.join('; ').replace(/%user/g, sanitize(searchValue)) + ')</span><img src="icon-search.svg" alt="Search this user" class="search-user" data-name="' + encodeURIComponent(node.name) + '" /></li>');
    }, 25);
    output.push('</ul>');
    document.getElementById('results').innerHTML = output.join("\n");
  }

  loadAjax('https://api.github.com/users/' + username + '/following', function(followings) {
    for (var i = 0; i < followings.length; i++) {
      var f = followings[i];
      connections.add(new Node(f.login, f.html_url, Node.TYPES.FOLLOWS));
    }
    found.FOLLOWS = true;
    checkDone();
  }, function() {
    found.FOLLOWS = true;
    checkDone();
  });
  loadAjax('https://api.github.com/users/' + username + '/followers', function(followers) {
    for (var i = 0; i < followers.length; i++) {
      var f = followers[i];
      connections.add(new Node(f.login, f.html_url, Node.TYPES.FOLLOWER));
    }
    found.FOLLOWER = true;
    checkDone();
  }, function() {
    found.FOLLOWER = true;
    checkDone();
  });
  // TODO: Also check company ('https://api.github.com/users/' + username -> result.company)
  loadAjax('https://api.github.com/users/' + username + '/orgs', function(orgs) {
    if (!orgs.length) {
      found.COLLEAGUE = true;
      checkDone();
    }
    for (var i = 0, numDone = 0, l = orgs.length; i < l; i++) {
      loadAjax('https://api.github.com/orgs/' + encodeURIComponent(orgs[i].login) + '/members', function(members) {
        for (j = 0; j < members.length; j++) {
          var m = members[j];
          connections.add(new Node(m.login, m.html_url, Node.TYPES.COLLEAGUE));
        }
        if (++numDone >= l) {
          found.COLLEAGUE = true;
          checkDone();
        }
      }, function() {
        if (++numDone >= l) {
          found.COLLEAGUE = true;
          checkDone();
        }
      });
    }
  });
  loadAjax('https://api.github.com/users/' + username + '/repos', function(repos) {
    if (!repos.length) {
      found.COLLABORATOR = true;
      found.CONTRIBUTOR = true;
      checkDone();
    }
    for (var i = 0, numDone = 0, l = repos.length; i < l; i++) {
      var fork = repos[i].fork;
      loadAjax('https://api.github.com/repos/' + repos[i].full_name + (fork ? '/collaborators' : '/contributors'), function(collaborators) {
        var type = fork ? Node.TYPES.COLLABORATOR : Node.TYPES.CONTRIBUTOR;
        for (j = 0; j < collaborators.length; j++) {
          var m = collaborators[j];
          connections.add(new Node(m.login, m.html_url, type));
        }
        if (++numDone >= l) {
          found.COLLABORATOR = true;
          found.CONTRIBUTOR = true;
          checkDone();
        }
      }, function() {
        if (++numDone >= l) {
          found.COLLABORATOR = true;
          found.CONTRIBUTOR = true;
          checkDone();
        }
      });
    }
  });
}

window.onload = function() {
  document.getElementById('here').textContent = location.href + (/\?/g.test(location.href) ? '&' : '?') + 'client_id=CLIENT_ID&client_secret=CLIENT_SECRET';
  if (window.CLIENT_ID && window.CLIENT_SECRET) {
    document.getElementById('info').style.display = 'none';
  }

  var elem = document.getElementById('username-field'),
      move = document.getElementById('search-results');
  var o = getPos(elem);
  move.style.position = 'absolute';
  move.style.left = o[0] + 'px';
  move.style.top = (o[1] + elem.offsetHeight) + 'px';

  var matches = /[?&]user=([^&#]+)/.exec(location.search);
  if (matches && matches[1]) {
    document.getElementById('username-field').value = matches[1];
    submitSearch();
  }

  document.getElementById('search-form').addEventListener('submit', submitSearch);

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
          users.push('<div class="suggestion" data-name="' + encodeURIComponent(u.login) + '"><img src="' + sanitize(u.avatar_url) + '" alt="' + n + '\'s avatar" /><span class="suggest-name">' + n + '</span></div>');
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

  document.getElementById('results').addEventListener('click', function(event) {
    event.preventDefault();
    var elem = event.target;
    if (elem && elem.nodeName.toLowerCase() == 'img' && ~elem.className.indexOf('search-user')) {
      document.getElementById('username-field').value = decodeURIComponent(elem.getAttribute('data-name'));
      submitSearch();
      document.body.scrollTop = document.documentElement.scrollTop = 0;
    }
  });
};
