const express = require('express');
const ejs = require('ejs');
const cookieParser = require('cookie-parser')
const fileUpload = require('express-fileupload');
const oauth = require("./oauth-promisified");
const {htmlToNpf} = require('deltaconvert');
const {env} = require("./env");

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', 'public');
app.use(cookieParser(env('COOKIE_SIGNING_SECRET')));

const HTML = express.text({
  type: 'text/html',
  limit: 8_192_000,
});

const FILE_UPLOAD = fileUpload({
  limits: { fileSize: 8_192_000 },
});

/**
 * @return {Promise<{ access_token: string, access_token_secret: string } | null>}
 */
async function getTumblrAccessTokenAndSecret(req) {
  const access_token = req.signedCookies.tumblr_access_token;
  const access_token_secret = req.signedCookies.tumblr_access_token_secret;
  if (!access_token || !access_token_secret) {
    return null;
  }
  return {access_token, access_token_secret};
}

app.post('/api/html2npf', HTML, (req, res) => {
  const npf = htmlToNpf(req.body);
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(npf));
});

app.get('/', async (req, res) => {
  let user = null;
  const connection = await getTumblrAccessTokenAndSecret(req);
  if (connection) {
    const {access_token, access_token_secret} = connection;
    try {
      const response = await oauth.get('https://api.tumblr.com/v2/user/info', access_token, access_token_secret);
      const data = JSON.parse(response.data);
      user = data.response.user;
    } catch (e) {
      console.error(e);
    }
  }
  res.render('index', {user});
});

function _14days() {
  return 14 * 24 * 60 * 60 * 1000;
}

app.get('/tumblr-login', async (req, res) => {
  const {remember_me} = req.query;
  const {token, token_secret} = await oauth.getOAuthRequestToken();

  res.cookie('tumblr_temporary_token', token, {httpOnly: true, signed: true});
  res.cookie('tumblr_temporary_token_secret', token_secret, {httpOnly: true, signed: true});
  res.cookie('remember_me', !!remember_me, {httpOnly: true, maxAge: _14days()});
  res.redirect('/tumblr-authorize');
});

app.get('/tumblr-authorize', async (req, res) => {
  const authorizeURL = new URL('https://www.tumblr.com/oauth/authorize');
  const token = req.signedCookies.tumblr_temporary_token;
  if (!token) {
    res.redirect('/');
    return;
  }

  authorizeURL.searchParams.set('oauth_token', token);
  res.redirect(authorizeURL);
});

function getMaxAgeForTumblrAccessTokens(req) {
  if (req.cookies.remember_me === 'true') {
    return _14days();
  }
  return undefined;
}

app.get('/tumblr-callback', async (req, res) => {
  const {oauth_token, oauth_verifier} = req.query;
  const token_secret = req.signedCookies.tumblr_temporary_token_secret;
  if (!token_secret) {
    res.redirect('/');
    return;
  }

  const {
    oauth_access_token,
    oauth_access_token_secret
  } = await oauth.getOAuthAccessToken(oauth_token, token_secret, oauth_verifier);

  const maxAge = getMaxAgeForTumblrAccessTokens(req);
  res.cookie('tumblr_access_token', oauth_access_token, {httpOnly: true, maxAge, signed: true});
  res.cookie('tumblr_access_token_secret', oauth_access_token_secret, {httpOnly: true, maxAge, signed: true});
  res.clearCookie('tumblr_temporary_token', {httpOnly: true, signed: true});
  res.clearCookie('tumblr_temporary_token_secret', {httpOnly: true, signed: true});
  res.redirect('/');
});

app.post('/post-to-tumblr', FILE_UPLOAD, async (req, res) => {
  const connection = await getTumblrAccessTokenAndSecret(req);
  if (!connection) {
    res.redirect('/tumblr-login');
    return;
  }

  const {access_token, access_token_secret} = connection;
  try {
    const blog = req.body.blog;
    const html = req.files.html.data.toString();
    const npf = htmlToNpf(html);
    const body = JSON.stringify({...npf, state: 'draft'});
    const result = await oauth.post(`https://api.tumblr.com/v2/blog/${blog}/posts`,
      access_token,
      access_token_secret,
      body,
      'application/json'
    );
    const data = JSON.parse(result.data);
    res.redirect(`https://www.tumblr.com/edit/${blog}/${data.response.id}`);
  }

  catch (error) {
    console.error('/post-to-tumblr', error);
    res.statusCode = 500;
    res.render('error.ejs');
  }
});

const port = parseInt(process.env.PORT);
app.listen(port, () => console.log(`listening on port ${port}`));
