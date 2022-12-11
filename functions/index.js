'use strict';

const functions = require('firebase-functions');
const { smarthome } = require('actions-on-google');
const { google } = require('googleapis');
const util = require('util');
const admin = require('firebase-admin');
const EcoStove = require('./ecoStove.js');
const { stripAuthorizationHeader, getUserHash } = require('./utils.js')

// Initialize
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
admin.initializeApp();
const firebaseRef = admin.database().ref('/');
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/homegraph'],
});
const homegraph = google.homegraph({
  version: 'v1',
  auth: auth,
});
const ecoStove = new EcoStove();
const app = smarthome();

app.onSync((body, headers) => {
  return {
    requestId: body.requestId,
    payload: {
      agentUserId: getUserHash(headers),
      devices: [{
        id: 'washer',
        type: 'action.devices.types.WASHER',
        traits: [
          'action.devices.traits.OnOff',
          //'action.devices.traits.StartStop',
          //'action.devices.traits.RunCycle',
        ],
        name: {
          defaultNames: ['My Washer'],
          name: 'Washer',
          nicknames: ['Washer'],
        },
        deviceInfo: {
          manufacturer: 'Acme Co',
          model: 'acme-washer',
          hwVersion: '1.0',
          swVersion: '1.0.1',
        },
        willReportState: true,
        attributes: {
          pausable: true,
        },
      }],
    },
  };
});

app.onQuery(async (body, headers) => {
  const { requestId } = body;
  const payload = {
    devices: {},
  };
  const queryPromises = [];
  const intent = body.inputs[0];

  for (const device of intent.payload.devices) {
    const deviceId = device.id;
    const userHash = getUserHash(headers);
    queryPromises.push(
      queryDevice(userHash, deviceId)
        .then((data) => {
          payload.devices[deviceId] = data;
        }));
  }

  // Wait for all promises to resolve
  await Promise.all(queryPromises);
  return {
    requestId: requestId,
    payload: payload,
  };
});

app.onExecute(async (body, headers) => {
  const { requestId } = body;
  // Execution results are grouped by status
  const result = {
    ids: [],
    status: 'SUCCESS',
    states: {
      online: true,
    },
  };

  const executePromises = [];
  const intent = body.inputs[0];
  for (const command of intent.payload.commands) {
    for (const device of command.devices) {
      for (const execution of command.execution) {
        const stripedAuthHeader = stripAuthorizationHeader(headers);
        executePromises.push(
          updateDevice(execution, getUserHash(headers), device.id, stripedAuthHeader)
            .then((data) => {
              result.ids.push(device.id);
              Object.assign(result.states, data);
            })
            .catch(() => functions.logger.error('onExecute', device.id)));

      }
    }
  }

  await Promise.all(executePromises);
  return {
    requestId: requestId,
    payload: {
      commands: [result],
    },
  };
});

app.onDisconnect((body, headers) => {
  functions.logger.log('onDisconnect: User account unlinked from Google Assistant');
  return {};
});

const updateDevice = async (execution, usernameHash, deviceId, deviceApiBaseAddress) => {
  const { params, command } = execution;
  let state;
  let ref;
  switch (command) {
    case 'action.devices.commands.OnOff':
      state = { on: params.on };
      try {
        // call Ecoforest API
        if (params.on === true) {
          await ecoStove.ecoTurnOn(deviceApiBaseAddress);
        } else {
          await ecoStove.ecoTurnOff(deviceApiBaseAddress);
        }

        // update DB
        ref = firebaseRef.child(usernameHash).child(deviceId).child('OnOff');
      }
      catch (err) {
        functions.logger.error(err);
        response.status(500).send(`updateDevice: update device error -  ${err}`);
      }
      break;
  }

  return ref.update(state).then(() => state);
};

const queryDevice = async (usernameHash, deviceId) => {
  const data = await queryFirebase(usernameHash, deviceId);
  return {
    on: data.on
  };
};

const queryFirebase = async (usernameHash, deviceId) => {
  const snapshot = await firebaseRef.child(usernameHash).child(deviceId).once('value');
  if (snapshot.exists()) {
    const snapshotVal = snapshot.val();
    return {
      on: snapshotVal.OnOff.on
    };
  } else {
    
    // ups! no state for this user/device. maybe its a new user!
    const pkg = {
      OnOff: { on: false }
    };
    firebaseRef.child(usernameHash).child(deviceId).set(pkg);

    return {
      on: false
    };
  }
};

///////////
exports.fakeauth = functions.https.onRequest((request, response) => {

  functions.logger.log('fakeauth: redirecting to login page');
  return response.redirect(
    `/login?responseurl=${request.query.redirect_uri}&state=${request.query.state}`)
});

exports.login = functions.https.onRequest((request, response) => {
  if (request.method === 'GET') {
    response.send(`
    <html>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <body>
        <form action="/login" method="post">
          <input type="hidden" name="responseurl" value="${request.query.responseurl}" />
          <input type="hidden" name="state" value="${request.query.state}" />
          <input name="address" value="my-ecoforest-url:port" /></br>
          <input name="serialnumber" value="my-serialnumber" /></br>
          <input name="password" value="my-password-8-digits" /></br>      
          <button type="submit" style="font-size:14pt">
            Submit
          </button>
        </form>
      </body>
    </html>
  `);
  } else if (request.method === 'POST') {
    const url = util.format(
      '%s?s&state=%s&code=%s',
      decodeURIComponent(request.body.responseurl),
      request.body.state,
      `https://${request.body.serialnumber}:${request.body.password}@${request.body.address}`);

    return response.redirect(url);
  } else {
    // Unsupported method
    response.send(405, 'Method Not Allowed');
  }
});

exports.faketoken = functions.https.onRequest((request, response) => {
  const secondsInDay = 86400;
  const HTTP_STATUS_OK = 200;

  try {
    const grantType = request.query.grant_type ? request.query.grant_type : request.body.grant_type;
    let obj;
    if (grantType === 'authorization_code') {
      const code = request.query.code ? request.query.code : request.body.code;
      obj = {
        token_type: 'bearer',
        access_token: code,  // "code" directly holds the User's API Ecoforest details for his device
        refresh_token: code, // this exploits "refres_token" not expiring... goal is to always have it without really storing it
        expires_in: secondsInDay,
      };
    } else if (grantType === 'refresh_token') {
      const code = request.query.refresh_token ? request.query.refresh_token : request.body.refresh_token;
      obj = {
        token_type: 'bearer',
        access_token: code,
        expires_in: secondsInDay,
      };
    }
    response.status(HTTP_STATUS_OK).json(obj);
  }
  catch (err) {
    functions.logger.error(err);
    response.status(500).send(`faketoken: Error requesting token: ${err}`);
  }
});

/**
 * Send a REPORT STATE call to the homegraph when data for any device id
 * has been changed.
 */
exports.reportstate = functions.database.ref('{usernameHash}/{deviceId}').onWrite(
  async (change, context) => {
    functions.logger.info('reportstate: Firebase write event triggered Report State');
    const snapshot = change.after.val();

    const requestBody = {
      requestId: 'ff36a3cc',
      agentUserId: context.params.usernameHash,
      payload: {
        devices: {
          states: {
            [context.params.deviceId]: {
              on: snapshot.OnOff.on,
            },
          },
        },
      },
    };

    const res = await homegraph.devices.reportStateAndNotification({
      requestBody,
    });
    functions.logger.info('reportstate: Report state response:', res.status, res.data);
  });

exports.smarthome = functions.https.onRequest(app);
