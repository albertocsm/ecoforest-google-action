'use strict';

const util = require('util');
const functions = require('firebase-functions');

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const readRequiredField = (body, fieldName) => {
  const value = body && typeof body[fieldName] === 'string' ? body[fieldName].trim() : '';
  if (!value) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return value;
};

const renderLoginPage = (query) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Link Ecoforest Fireplace</title>
      <style>
        :root {
          color-scheme: light;
          --bg-top: #f6efe5;
          --bg-bottom: #e7ecef;
          --card: rgba(255, 252, 247, 0.96);
          --text: #23313a;
          --muted: #60707a;
          --accent: #b2542d;
          --accent-dark: #8f3f1e;
          --line: #d8d3cb;
          --shadow: 0 24px 60px rgba(41, 34, 28, 0.14);
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-height: 100vh;
          font-family: Georgia, "Times New Roman", serif;
          color: var(--text);
          background:
            radial-gradient(circle at top left, rgba(178, 84, 45, 0.12), transparent 28%),
            linear-gradient(180deg, var(--bg-top), var(--bg-bottom));
        }

        .wrap {
          width: min(100%, 30rem);
          margin: 0 auto;
          padding: 1.25rem;
        }

        .card {
          margin: 1.5rem 0;
          padding: 1.25rem;
          border: 1px solid rgba(216, 211, 203, 0.9);
          border-radius: 1.25rem;
          background: var(--card);
          box-shadow: var(--shadow);
          backdrop-filter: blur(10px);
        }

        h1 {
          margin: 0 0 0.5rem;
          font-size: 1.8rem;
          line-height: 1.1;
        }

        p {
          margin: 0;
          line-height: 1.45;
        }

        .intro {
          color: var(--muted);
          margin-bottom: 1.25rem;
        }

        .example {
          margin: 1rem 0 1.25rem;
          padding: 0.9rem 1rem;
          border-radius: 1rem;
          background: #f7f1ea;
          border: 1px solid var(--line);
        }

        .example strong,
        label {
          display: block;
          margin-bottom: 0.35rem;
          font-size: 0.95rem;
          font-weight: 700;
        }

        .example code {
          display: block;
          overflow-wrap: anywhere;
          font-size: 0.92rem;
          color: var(--accent-dark);
        }

        .hint-list {
          margin: 0.75rem 0 0;
          padding-left: 1.1rem;
          color: var(--muted);
        }

        .field {
          margin-bottom: 1rem;
        }

        input {
          width: 100%;
          padding: 0.95rem 1rem;
          border: 1px solid var(--line);
          border-radius: 0.95rem;
          background: #fff;
          color: var(--text);
          font: inherit;
          font-size: 1rem;
          appearance: none;
        }

        input:focus {
          outline: 2px solid rgba(178, 84, 45, 0.18);
          border-color: var(--accent);
        }

        .hint {
          margin-top: 0.35rem;
          font-size: 0.84rem;
          line-height: 1.35;
          color: var(--muted);
        }

        button {
          width: 100%;
          margin-top: 0.5rem;
          padding: 1rem;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(180deg, var(--accent), var(--accent-dark));
          color: #fffaf4;
          font: inherit;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .footer {
          margin-top: 1rem;
          font-size: 0.84rem;
          color: var(--muted);
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <h1>Link your Ecoforest fireplace</h1>
          <p class="intro">Enter the same connection details used by the Ecoforest web app so Google Home can talk to your device.</p>

          <div class="example">
            <strong>What you need</strong>
            <ul class="hint-list">
              <li>Address example: <code>easynet1.ecoforest.es:12345</code></li>
              <li>Serial number: the 11-digit device serial, for example <code>12345678912</code></li>
              <li>Password: the first 8 characters of the device password, for example <code>qwertqwe</code></li>
            </ul>
          </div>

          <form action="/login" method="post">
            <input type="hidden" name="responseurl" value="${escapeHtml(query.responseurl || '')}" />
            <input type="hidden" name="state" value="${escapeHtml(query.state || '')}" />

            <div class="field">
              <label for="address">Address</label>
              <input id="address" name="address" type="text" inputmode="url" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="easynet1.ecoforest.es:12345" required>
              <div class="hint">Type only the host and port.</div>
            </div>

            <div class="field">
              <label for="serialnumber">Serial number</label>
              <input id="serialnumber" name="serialnumber" type="text" inputmode="numeric" pattern="[0-9]{11}" maxlength="11" placeholder="12345678912" required>
              <div class="hint">Use the 11-digit serial number from the device.</div>
            </div>

            <div class="field">
              <label for="password">Device password</label>
              <input id="password" name="password" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="8" placeholder="qwertqwe" required>
              <div class="hint">Use the first 8 characters of the device password.</div>
            </div>

            <button type="submit">Link fireplace</button>
          </form>
        </div>
      </div>
    </body>
  </html>
`;

const fakeauth = (request, response) => {
  functions.logger.log('fakeauth: redirecting to login page');
  return response.redirect(
    `/login?responseurl=${request.query.redirect_uri}&state=${request.query.state}`
  );
};

const login = (request, response) => {
  if (request.method === 'GET') {
    response.send(renderLoginPage(request.query));
    return;
  }

  if (request.method === 'POST') {
    try {
      const responseUrl = decodeURIComponent(readRequiredField(request.body, 'responseurl'));
      const state = readRequiredField(request.body, 'state');
      const address = readRequiredField(request.body, 'address');
      const serialnumber = readRequiredField(request.body, 'serialnumber');
      const password = readRequiredField(request.body, 'password');
      const redirectUrl = util.format(
        '%s?s&state=%s&code=%s',
        responseUrl,
        state,
        `https://${serialnumber}:${password}@${address}`
      );

      response.redirect(redirectUrl);
      return;
    }
    catch (error) {
      response.status(400).send(error.message);
      return;
    }
  }

  response.status(405).send('Method Not Allowed');
};

const faketoken = (request, response) => {
  const secondsInDay = 86400;
  const httpStatusOk = 200;

  try {
    const grantType = request.query.grant_type || request.body.grant_type;
    let payload;

    if (grantType === 'authorization_code') {
      const code = request.query.code || request.body.code;
      payload = {
        token_type: 'bearer',
        access_token: code,
        refresh_token: code,
        expires_in: secondsInDay,
      };
    } else if (grantType === 'refresh_token') {
      const code = request.query.refresh_token || request.body.refresh_token;
      payload = {
        token_type: 'bearer',
        access_token: code,
        expires_in: secondsInDay,
      };
    } else {
      response.status(400).send('Unsupported grant type');
      return;
    }

    response.status(httpStatusOk).json(payload);
  }
  catch (err) {
    functions.logger.error(`faketoken: ${err}`);
    response.status(500).send(`faketoken: Error requesting token: ${err}`);
  }
};

module.exports = {
  escapeHtml,
  fakeauth,
  faketoken,
  login,
  readRequiredField,
  renderLoginPage,
};
