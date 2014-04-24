Shows users who are related to another user on GitHub.

### [Try the demo!](https://icecreamyou.github.io/github-connections)

## Setup

You should authenticate with Github to raise API rate limits from 60/hr to
5000/hr. To do so,
[create a new application](https://github.com/settings/applications/new) using
the following values:

 - **Application name:** GitHub Connections
 - **Homepage URL:** *your URL, e.g. `http://localhost/` or `https://icecreamyou.github.io/github-connections`*
 - **Description:** *up to you, or just leave this blank*
 - **Authorization callback URL:** *this isn't used so just pick something like `http://localhost/oauth`*

When you're done, you'll get a client ID and client secret. If you're setting
up your own instance of GitHub Connections, copy-paste those values into
`config.js`. Otherwise, change the URL of this page to include the values like
this, replacing `CLIENT_ID` and `CLIENT_SECRET` with your corresponding tokens:

    https://icecreamyou.github.io/github-connections/?client_id=CLIENT_ID&amp;client_secret=CLIENT_SECRET

## Notes

You can automatically search for a user using the `user` URL parameter. For
example, `https://icecreamyou.github.io/github-connections/?user=IceCreamYou`
will automatically search for users similar to IceCreamYou.

Also, this can produce some interesting results, but it's still mostly a toy;
several types of network analysis are currently not performed because they are
too expensive in terms of the number of API queries required relative to
GitHub's rate limiting.

This project is MIT-licensed and contributions are welcome.
