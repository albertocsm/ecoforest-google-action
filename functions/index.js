'use strict';

const functions = require('firebase-functions/v1');
const { smarthome } = require('actions-on-google');
const { google } = require('googleapis');
const admin = require('firebase-admin');
const EcoStove = require('./ecoStove.js');
const { DEVICE_ID, buildSyncDevice, toGoogleStates } = require('./deviceState.js');
const { updateDevice, queryDevice } = require('./deviceControl.js');
const { extractStoredDeviceState } = require('./stateStore.js');
const { fakeauth, faketoken, login } = require('./authHandlers.js');
const { toExecuteErrorCode } = require('./errors.js');
const { delay, stripAuthorizationHeader, getUserHash } = require('./utils.js');

const buildExecuteResult = (deviceId, outcome) => ({
  ids: [deviceId],
  status: outcome.status,
  ...(outcome.states ? { states: outcome.states } : {}),
  ...(outcome.errorCode ? { errorCode: outcome.errorCode } : {}),
});

const adminApp = admin.apps.length === 0 ? admin.initializeApp() : admin.app();

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/homegraph'],
});
const homegraph = google.homegraph({
  version: 'v1',
  auth: auth,
});
const ecoStove = new EcoStove();
const app = smarthome();

const getFirebaseRef = () => adminApp.database().ref('/');

app.onSync((body, headers) => {
  functions.logger.info(`onSync...`);
  return {
    requestId: body.requestId,
    payload: {
      agentUserId: getUserHash(headers),
      devices: [buildSyncDevice()],
    },
  };
});

app.onQuery(async (body, headers) => {
  functions.logger.info(`onQuery...`);
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
      queryDevice({
        usernameHash: userHash,
        deviceId,
        deviceApiBaseAddress: stripAuthorizationHeader(headers),
        ecoStove,
        firebaseRef: getFirebaseRef(),
        logger: functions.logger,
        delay,
      })
        .then((data) => {
          payload.devices[deviceId] = data;
        }));
  }

  await Promise.all(queryPromises);
  return {
    requestId: requestId,
    payload: payload,
  };
});

app.onExecute(async (body, headers) => {
  functions.logger.info(`onExecute...`);
  const { requestId } = body;
  const executePromises = [];
  const intent = body.inputs[0];
  for (const command of intent.payload.commands) {
    for (const device of command.devices) {
      for (const execution of command.execution) {
        executePromises.push(
          updateDevice({
            execution,
            usernameHash: getUserHash(headers),
            deviceId: device.id,
            deviceApiBaseAddress: stripAuthorizationHeader(headers),
            ecoStove,
            firebaseRef: getFirebaseRef(),
            logger: functions.logger,
          })
            .then((data) => buildExecuteResult(device.id, {
              status: 'SUCCESS',
              states: data,
            }))
            .catch((error) => {
              functions.logger.error('onExecute', device.id, error);
              return buildExecuteResult(device.id, {
                status: 'ERROR',
                errorCode: toExecuteErrorCode(error),
              });
            }));

      }
    }
  }

  const commands = await Promise.all(executePromises);
  return {
    requestId: requestId,
    payload: {
      commands,
    },
  };
});

app.onDisconnect(() => {
  functions.logger.log('onDisconnect...');
  return {};
});

exports.fakeauth = functions.https.onRequest(fakeauth);
exports.login = functions.https.onRequest(login);
exports.faketoken = functions.https.onRequest(faketoken);

exports.reportstate = functions.database.ref('{usernameHash}/{deviceId}').onWrite(
  async (change, context) => {
    functions.logger.info('reportstate: Firebase write event triggered');
    const snapshot = change.after.val();
    if (snapshot !== null) {
      const state = extractStoredDeviceState(snapshot);

      if (state === null) {
        functions.logger.warn('reportstate: no compatible state found');
        return;
      }

      const requestBody = {
        requestId: 'ff36a3cc',
        agentUserId: context.params.usernameHash,
        payload: {
          devices: {
            states: {
              [context.params.deviceId]: toGoogleStates(state),
            },
          },
        },
      };

      await homegraph.devices.reportStateAndNotification({
        requestBody,
      });
    }
    else {
      functions.logger.warn(`reportstate: no state. was the entry manualy deleted?`);
    }
  });

exports.smarthome = functions.https.onRequest(app);
