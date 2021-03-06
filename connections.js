/**
 * Get users who are related to another user on GitHub.
 *
 * TODO: Add a multiplier field to Node types for contributors (commit count)
 *   and colleagues (inverse of people in the organization)
 * TODO: Figure out how to capture commits to repos the searched user doesn't
 *   maintain. One way may be to search through issues using ?involves:
 *   https://developer.github.com/v3/search/#search-issues
 *   It may also be the case that (1) all repos you have commit access to show
 *   up at /user/:name/repos, (2) all repos for orgs you're not in that you've
 *   landed commits in require having a fork, and (3) it might be possible to
 *   commit to org repos without those showing up at /user/:name/repos if
 *   you're in the org. So, we can follow those paths to get the relevant repos.
 * TODO: Follow pagination if there are too many results for queries
 * TODO: Set up a server to authenticate people for the demo without exposing
 *   my client secret. Resources:
 *   http://developer.github.com/v3/oauth/
 *   https://github.com/prose/gatekeeper
 *   http://fajitanachos.com/Authenticating-with-the-GitHub-API/
 * TODO: Several types of network analysis are currently not performed because
 *   they are too expensive in terms of number of API queries.
 */

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
function process(searchValue, username) {
    var connections = new Set(searchValue);
    var found = {
        FOLLOWS: false,
        FOLLOWER: false,
        COLLABORATOR: false,
        COLLEAGUE: false,
        CONTRIBUTOR: false,
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
            var types = {}, seen = [];
            for (var i = 0, l = node.types.length; i < l; i++) {
                var t = node.types[i];
                if (types.hasOwnProperty(t)) {
                    if (t === Node.TYPES.COLLEAGUE) {
                        types[t] = 'in the same organizations';
                        continue;
                    }
                    else if (t === Node.TYPES.COLLABORATOR) {
                        types[t] = 'shared commit access to multiple repos';
                        continue;
                    }
                    else if (t === Node.TYPES.CONTRIBUTOR) {
                        types[t] = 'this user contributed to repos %user maintains';
                        continue;
                    }
                }
                types[t] = t;
            }
            var s = [];
            for (var key in types) {
                if (types.hasOwnProperty(key)) {
                    s.push(types[key]);
                }
            }
            output.push('<li><a href="' + sanitize(node.url) + '" target="_blank">' + sanitize(node.name) + '</a><span class="why">(' + s.join('; ').replace(/%user/g, sanitize(searchValue)) + ')</span><img src="icon-search.svg" alt="Search this user" class="search-user" data-name="' + encodeURIComponent(node.name) + '" /></li>');
        }, NUM_RESULTS);
        output.push('</ul>');
        document.getElementById('results').innerHTML = output.join("\n");
    }

    loadAjax('https://api.github.com/users/' + username + '/following', function(followings) {
        for (var i = 0; i < followings.length; i++) {
            var f = followings[i];
            connections.add(new Node(f.login, f.html_url, Node.TYPES.FOLLOWS));
        }
    }, function() {
        found.FOLLOWS = true;
        checkDone();
    });
    loadAjax('https://api.github.com/users/' + username + '/followers', function(followers) {
        for (var i = 0; i < followers.length; i++) {
            var f = followers[i];
            connections.add(new Node(f.login, f.html_url, Node.TYPES.FOLLOWER));
        }
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
            }, function() {
                if (++numDone >= l) {
                    found.COLLEAGUE = true;
                    checkDone();
                }
            });
        }
    }, function(xhr, success) {
        // If we didn't run the success callback, something's wrong,
        // but we should bail on this section and display the results we have anyway.
        if (!success) {
            found.COLLEAGUE = true;
            checkDone();
        }
    });
    loadAjax('https://api.github.com/users/' + username + '/repos?type=all', function(repos) {
        if (!repos.length) {
            found.COLLABORATOR = true;
            found.CONTRIBUTOR = true;
            checkDone();
        }
        for (var i = 0, numDone = 0, l = repos.length; i < l; i++) {
            (function(fork) {
                // For forks we want the people with commit access to the *fork*, i.e. /collaborators.
                // For forks, /contributors shows everyone who has landed commits in the original repo, and the searched user doesn't necessarily know them.
                // Not all collaborators are necessarily contributors; just because you have commit access doesn't mean you've committed.
                // However, I think it's safe to assume that we'll capture the important relationships via /contributors for non-forks.
                loadAjax('https://api.github.com/repos/' + repos[i].full_name + (fork ? '/collaborators' : '/contributors'), function(collaborators) {
                    var type = fork ? Node.TYPES.COLLABORATOR : Node.TYPES.CONTRIBUTOR;
                    for (j = 0; j < collaborators.length; j++) {
                        var m = collaborators[j];
                        connections.add(new Node(m.login, m.html_url, type));
                    }
                }, function() {
                    if (++numDone >= l) {
                        found.COLLABORATOR = true;
                        found.CONTRIBUTOR = true;
                        checkDone();
                    }
                });
            })(repos[i].fork);
        }
    }, function(xhr, success) {
        // If we didn't run the success callback, something's wrong,
        // but we should bail on this section and display the results we have anyway.
        if (!success) {
            found.COLLABORATOR = true;
            found.CONTRIBUTOR = true;
            checkDone();
        }
    });
}

function setup() {
    document.getElementById('results').addEventListener('click', function(event) {
        event.preventDefault();
        var elem = event.target;
        if (elem && elem.nodeName.toLowerCase() == 'img' && ~elem.className.indexOf('search-user')) {
            document.getElementById('username-field').value = decodeURIComponent(elem.getAttribute('data-name'));
            submitSearch();
            document.body.scrollTop = document.documentElement.scrollTop = 0;
        }
    });
}
