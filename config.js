/**
 * Set the client ID and secret to raise API rate limits from 60/hr to 5000/hr.
 *
 * To get a client ID and secret, visit
 * https://github.com/settings/applications/new using the following values:
 *
 * - Application name: GitHub Connections
 * - Homepage URL: your URL, e.g. http://localhost/ or https://icecreamyou.github.io/github-connections
 * - Description: up to you, or just leave this blank
 * - Authorization callback URL: this isn't used so just pick something like http://localhost/oauth
 */
CLIENT_ID = '';
CLIENT_SECRET = '';

/**
 * Whether to pop up an alert when a GitHub API request fails.
 * Either way the error will be logged to the console.
 */
NOISY = false;

/**
 * Set how relatively important each kind of connection is.
 */
WEIGHTS = {
  COLLABORATOR: 100, // If people share commit access, they almost certainly know each other.
  FOLLOWS: 50, // Follows are a signal of interest in someone's work, not necessarily of a mutual relationship, but you're more likely to follow people you know
  CONTRIBUTOR: 42, // A maintainer often, but not always, knows the people contributing; regardless, enough commits make mutual recognition likely. Yay open source!
  COLLEAGUE: 35, // For smallish orgs, it's very likely that people know each other. For large orgs, much less likely.
  FOLLOWER: 10, // People who know you are more likely to follow you, but if you don't follow them back it could also be someone random who is interested in your work
  ISSUE_PARTICIPANT: 2, // Participating in the same issues does not, in general, represent a strong indicator of knowing someone.
  FOLLOWED_REPO_MAINTAINER: 2, // People star a lot of repos they think are interesting and don't necessarily know the maintainers.
  REPO_FOLLOWER: 0.1, // A maintainer is even less likely to know the people following their repos.
};
