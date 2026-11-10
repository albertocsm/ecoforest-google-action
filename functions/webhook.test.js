'use strict';

const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const Module = require('module');

const baseUrl = 'https://serial:password@device.example:8000';
const authorization = `Bearer ${baseUrl}`;
const userHash = crypto.createHash('md5').update(baseUrl).digest('hex');
const initialState = {on: true, power: 3, quiet: true};
const records = new Map([[`${userHash}/fireplace`, {state: initialState}]]);
const reads = [];
const writes = [];
const stoveCalls = [];

const ref = (path = '') => ({
  child(key) {
    return ref(path ? `${path}/${key}` : key);
  },
  async once(event) {
    assert.strictEqual(event, 'value');
    reads.push(path);
    const value = records.get(path);
    return {exists: () => value !== undefined, val: () => value};
  },
  async set(value) {
    writes.push({path, value});
    records.set(path, value);
  },
});

const database = {ref: (path) => {
  assert.strictEqual(path, '/');
  return ref();
}};
const adminApp = {};
const logger = {info() {}, warn() {}, error() {}, log() {}};
const functions = {
  logger,
  https: {onRequest: (handler) => handler},
  database: {ref: () => ({onWrite: (handler) => handler})},
};
/* eslint-disable jsdoc/require-jsdoc */
class Stove {
  async ecoGetStatus(address) {
    stoveCalls.push(['status', address]);
    return initialState;
  }
  async ecoSetPower(address, power) {
    stoveCalls.push(['power', address, power]);
  }
  async ecoSetQuietMode(address, quiet) {
    stoveCalls.push(['quiet', address, quiet]);
  }
  async ecoTurnOn(address) {
    stoveCalls.push(['on', address]);
  }
  async ecoTurnOff(address) {
    stoveCalls.push(['off', address]);
  }
}
/* eslint-enable jsdoc/require-jsdoc */

// The Actions SDK and device logic are real; external boundaries are stubbed.
const stubs = {
  'firebase-functions/v1': functions,
  'firebase-admin/app': {
    getApps: () => [],
    getApp: () => adminApp,
    initializeApp: () => adminApp,
  },
  'firebase-admin/database': {getDatabase: () => database},
  'googleapis': {
    google: {
      auth: {GoogleAuth: class {}},
      homegraph: () => ({devices: {reportStateAndNotification: () => {
        throw new Error('Unexpected Home Graph call');
      }}}),
    },
  },
  './ecoStove.js': Stove,
};
const load = Module._load;
let webhook;
try {
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) {
      return stubs[request];
    }
    return load.call(this, request, parent, isMain);
  };
  webhook = require('./index.js').smarthome;
} finally {
  Module._load = load;
}

// The SDK expects an Express-style response; use real HTTP for request headers
// and JSON transport while providing only the response methods the SDK needs.
const server = http.createServer((req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    try {
      req.body = JSON.parse(body);
      req.get = (name) => req.headers[name.toLowerCase()];
      res.status = (code) => {
        res.statusCode = code; return res;
      };
      res.send = (value) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(value));
      };
      webhook(req, res);
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({error: error.message}));
    }
  });
});

const post = (body) => new Promise((resolve, reject) => {
  const request = http.request({
    host: '127.0.0.1',
    port: server.address().port,
    method: 'POST',
    path: '/',
    headers: {authorization, 'content-type': 'application/json'},
  }, (response) => {
    let data = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      try {
        assert.strictEqual(response.statusCode, 200, data);
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    response.on('error', reject);
  });
  request.on('error', reject);
  request.setTimeout(5000, () => {
    request.destroy(new Error('Webhook request timed out'));
  });
  request.end(JSON.stringify(body));
});

const request = (requestId, intent, payload) => {
  const input = {intent: `action.devices.${intent}`};
  if (payload) input.payload = payload;
  return {requestId, inputs: [input]};
};

const run = async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const sync = await post(request('sync-1', 'SYNC'));
    assert.strictEqual(sync.requestId, 'sync-1');
    assert.strictEqual(sync.payload.agentUserId, userHash);
    assert.strictEqual(sync.payload.devices.length, 1);
    const device = sync.payload.devices[0];
    assert.strictEqual(device.id, 'fireplace');
    assert.strictEqual(device.type, 'action.devices.types.FIREPLACE');
    assert.deepStrictEqual(device.traits, [
      'action.devices.traits.OnOff',
      'action.devices.traits.Brightness',
      'action.devices.traits.Modes',
      'action.devices.traits.Toggles',
    ]);
    assert.strictEqual(device.willReportState, true);

    const query = await post(request('query-1', 'QUERY', {
      devices: [{id: 'fireplace'}],
    }));
    assert.deepStrictEqual(query, {
      requestId: 'query-1',
      payload: {devices: {fireplace: {
        status: 'SUCCESS', online: true, on: true, brightness: 30,
        currentModeSettings: {power_mode: '3_power'},
        currentToggleSettings: {silence_toggle: true},
      }}},
    });
    assert.deepStrictEqual(reads, [`${userHash}/fireplace`]);
    assert.deepStrictEqual(stoveCalls, [['status', baseUrl]]);
    assert.deepStrictEqual(writes, []);

    const execute = await post(request('execute-1', 'EXECUTE', {
      commands: [{
        devices: [{id: 'fireplace'}],
        execution: [{
          command: 'action.devices.commands.SetModes',
          params: {updateModeSettings: {power_mode: '5_power'}},
        }],
      }],
    }));
    assert.deepStrictEqual(execute, {
      requestId: 'execute-1',
      payload: {commands: [{
        ids: ['fireplace'], status: 'SUCCESS',
        states: {
          online: true, on: true, brightness: 50,
          currentModeSettings: {power_mode: '5_power'},
          currentToggleSettings: {silence_toggle: true},
        },
      }]},
    });
    assert.deepStrictEqual(reads, [
      `${userHash}/fireplace`, `${userHash}/fireplace`,
    ]);
    assert.deepStrictEqual(stoveCalls, [
      ['status', baseUrl], ['power', baseUrl, 5],
    ]);
    assert.deepStrictEqual(writes, [{
      path: `${userHash}/fireplace`,
      value: {state: {on: true, power: 5, quiet: true}},
    }]);

    const failure = await post(request('execute-error', 'EXECUTE', {
      commands: [{
        devices: [{id: 'fireplace'}],
        execution: [{
          command: 'action.devices.commands.Unsupported', params: {},
        }],
      }],
    }));
    assert.deepStrictEqual(failure, {
      requestId: 'execute-error',
      payload: {commands: [{
        ids: ['fireplace'], status: 'ERROR', errorCode: 'protocolError',
      }]},
    });
    assert.strictEqual(writes.length, 1);
    assert.strictEqual(stoveCalls.length, 2);

    const disconnect = await post(request('disconnect-1', 'DISCONNECT'));
    assert.deepStrictEqual(disconnect, {});
    assert.strictEqual(reads.length, 3);
    assert.strictEqual(writes.length, 1);
    assert.strictEqual(stoveCalls.length, 2);
    console.log('Webhook tests passed');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
