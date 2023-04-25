const OAuth = require("oauth");
const {env} = require('./env');

const TUMBLR_CONSUMER_KEY = env('TUMBLR_CONSUMER_KEY');
const TUMBLR_CONSUMER_SECRET = env('TUMBLR_CONSUMER_SECRET');

const oauth = new OAuth.OAuth(
  'https://www.tumblr.com/oauth/request_token',
  'https://www.tumblr.com/oauth/access_token',
  TUMBLR_CONSUMER_KEY,
  TUMBLR_CONSUMER_SECRET,
  '1.0A',
  null,
  'HMAC-SHA1'
);

/**
 * Get a temporary token, which can be used to redirect the user to a tumblr
 * authentication page.
 * @return {Promise<{token: string, token_secret: string, parsedQueryString: any}>}
 */
exports.getOAuthRequestToken = () => {
  return new Promise((resolve, reject) => {
    oauth.getOAuthRequestToken((err, token, token_secret, parsedQueryString) => {
      if (err) {
        reject(err);
      } else {
        resolve({ token, token_secret, parsedQueryString });
      }
    });
  });
}

/**
 * Exchange tokens from a tumblr authentication page for permanent access tokens.
 * @param oauth_token {string}
 * @param oauth_token_secret {string}
 * @param oauth_verifier {string}
 * @return {Promise<{ oauth_access_token: string, oauth_access_token_secret: string, results: any }>}
 */
exports.getOAuthAccessToken = (oauth_token, oauth_token_secret, oauth_verifier) => {
  return new Promise((resolve, reject) => {
    oauth.getOAuthAccessToken(oauth_token, oauth_token_secret, oauth_verifier, (err, oauth_access_token, oauth_access_token_secret, results) => {
      if (err) {
        reject(err);
      } else {
        resolve({ oauth_access_token, oauth_access_token_secret, results });
      }
    });
  });
}

/**
 * Make a GET request on behalf of a user.
 * @param url {string}
 * @param oauth_token {string}
 * @param oauth_token_secret {string}
 * @return {Promise<{ data: any, response: import('http').IncomingMessage }>}
 */
exports.get = (url, oauth_token, oauth_token_secret) => {
  return new Promise((resolve, reject) =>  {
    oauth.get(url, oauth_token, oauth_token_secret, (err, data, response) => {
      if (err) {
        reject(err);
      } else {
        resolve({ data, response });
      }
    });
  });
}

/**
 * Make a POST request on behalf of a user.
 * @param url {string}
 * @param oauth_token {string}
 * @param oauth_token_secret {string}
 * @param post_body {any}
 * @param post_content_type {string}
 * @return {Promise<{ data: any, response: import('http').IncomingMessage }>}
 */
exports.post = (url, oauth_token, oauth_token_secret, post_body, post_content_type) => {
  return new Promise((resolve, reject) =>  {
    oauth.post(url, oauth_token, oauth_token_secret, post_body, post_content_type, (err, data, response) => {
      if (err) {
        reject(err);
      } else {
        resolve({ data, response });
      }
    });
  });
}
