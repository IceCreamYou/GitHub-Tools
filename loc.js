/**
 * Convert a number to a human-friendly string, e.g. 1000000 -> '1,000,000'.
 */
function putCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get and process results.
 */
function process(searchValue, username) {
    loadAjax(
        'https://api.github.com/users/' + username + '/repos?type=all',
        function(repos) { processRepos(repos, searchValue); }
    );
}

function processRepos(repos, searchValue) {
    var locAdded = 0,
        locAddedNoFork = 0,
        locRemoved = 0,
        locRemovedNoFork = 0,
        locNet = 0,
        locNetNoFork = 0,
        locTotal = 0,
        locTotalNoFork = 0,
        completed = 0,
        results = [];
    for (var i = 0, rl = repos.length; i < rl; i++) {
        var r = repos[i];
        (function(r) {
            loadAjax('https://api.github.com/repos/' + encodeURIComponent(r.owner.login) + '/' + encodeURIComponent(r.name) + '/stats/contributors', function(stats) {
                if (!stats.length) return;
                var j,
                    l = stats.length,
                    unit; // Data for the user we're looking at
                // Look through the contributors for the searched user
                for (j = 0; j < l; j++) {
                    if (stats[j].author.login == searchValue) {
                        unit = stats[j];
                        break;
                    }
                }
                // If the searched user isn't there, he/she hasn't landed any commits
                if (!unit) {
                    results.push([
                        0,
                        '<a href="' + sanitize(r.html_url) + '">' +
                            sanitize(r.name) +
                        '</a>' +
                        (r.fork ? '<span class="fork">[FORK]</span>' : '') +
                        '<span class="repo-stats">' +
                            '<span class="added">A: 0</span><span class="removed">R: 0</span><span>N: 0</span><span class="total">T: 0</span>' +
                        '</span>'
                    ]);
                    return;
                }
                l = unit.weeks.length;
                var a = 0, d = 0, n = 0, t = 0;
                for (j = 0; j < l; j++) {
                    var s = unit.weeks[j];
                    a += s.a;
                    d += s.d;
                    n += s.a - s.d;
                    t += s.a + s.d;
                }
                locAdded += a;
                locRemoved += d;
                locNet += n;
                locTotal += t;
                if (!r.fork) {
                    locAddedNoFork += a;
                    locRemovedNoFork += d;
                    locNetNoFork += n;
                    locTotalNoFork += t;
                }
                results.push([
                    t,
                    '<a href="' + sanitize(r['html_url']) + '">' +
                        sanitize(r['name']) +
                    '</a>' +
                    (r.fork ? '<span class="fork">[FORK]</span>' : '') +
                    '<span class="repo-stats">' +
                        '<span class="added">A: ' + putCommas(a) + '</span>' +
                        '<span class="removed">R: ' + putCommas(d) + '</span>' +
                        '<span>N: ' + putCommas(n) + '</span>' +
                        '<span class="total">T: ' + putCommas(t) + '</span>' +
                    '</span>'
                ]);
            }, function() {
                if (++completed == rl) {
                    document.getElementById('results').innerHTML =
                        '<p class="summary">' + rl + ' repositories<br />' +
                            '<span class="added">' + putCommas(locAdded) + '</span> LOC <strong>A</strong>dded (' + putCommas(locAddedNoFork) + ' excluding forks)<br />' +
                            '<span class="removed">' + putCommas(locRemoved) + '</span> LOC <strong>R</strong>emoved (' + putCommas(locRemovedNoFork) + ' excluding forks)<br />' +
                            putCommas(locNet) + ' LOC <strong>N</strong>et (' + putCommas(locNetNoFork) + ' excluding forks)<br />' +
                            putCommas(locTotal) + ' LOC <strong>T</strong>otal (' + putCommas(locTotalNoFork) + ' excluding forks)' +
                        '<p>' +
                        '<ul>' +
                            '<li>' + results.sort(function(a, b) {
                                    return b[0] - a[0];
                                }).map(function(a) { return a[1]; }).join('</li><li>') +
                            '</li>' +
                        '</ul>';
                }
            });
        })(r);
    }
}
