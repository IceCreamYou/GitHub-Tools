Tools for finding out information about users on GitHub. Currently there are
two:

 - [GitHub Connections](https://icecreamyou.github.io/GitHub-Tools)
   shows users who another user might know via a real-world relationship
 - [GitHub Lines of Code](https://icecreamyou.github.io/GitHub-Tools/loc.html)
   shows aggregate statistics about users' repositories

Click the links above to try demos.

## Setup

You should authenticate with Github to raise API rate limits from 60/hr to
5000/hr. To do so,
[create a new application](https://github.com/settings/applications/new) using
the following values:

 - **Application name:** GitHub Tools
 - **Homepage URL:** *your URL, e.g. `http://localhost/` or `https://icecreamyou.github.io/GitHub-Tools`*
 - **Description:** *up to you, or just leave this blank*
 - **Authorization callback URL:** *this isn't used so just pick something like `http://localhost/oauth`*

When you're done, you'll get a client ID and client secret. If you're setting
up your own instance of GitHub Tools, copy-paste those values into `config.js`.
Otherwise, change the URL of this page to include the values like this,
replacing `CLIENT_ID` and `CLIENT_SECRET` with your corresponding tokens:

    https://icecreamyou.github.io/GitHub-Tools/?client_id=CLIENT_ID&amp;client_secret=CLIENT_SECRET

## Notes

You can automatically search for a user using the `user` URL parameter. For
example, `https://icecreamyou.github.io/GitHub-Tools/?user=IceCreamYou`
will automatically search for users similar to IceCreamYou.

GitHub's API rate limits constrain the possible kinds of analyses, so don't
take the results with more seriousness than they deserve.

This project is MIT-licensed and contributions are welcome.
