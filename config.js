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
  FOLLOWS: 0.75,
  FOLLOWER: 0.15,
  COLLABORATOR: 1.0,
  COLLEAGUE: 0.3,
  CONTRIBUTOR: 0.1,
  CONTRIBUTEE: 0.15,
  ISSUE_PARTICIPANT: 0.01,
  FOLLOWED_REPO_MAINTAINER: 0.02,
  REPO_FOLLOWER: 0.001,
};
