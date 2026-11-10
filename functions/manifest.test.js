'use strict';

const assert = require('assert');

process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: 'demo-ecoforest',
  databaseURL: 'https://demo-ecoforest-default-rtdb.firebaseio.com',
});
process.env.GCLOUD_PROJECT = 'demo-ecoforest';

const functions = require('./index.js');
assert.deepStrictEqual(Object.keys(functions).sort(), [
  'fakeauth', 'faketoken', 'login', 'reportstate', 'smarthome',
]);

for (const name of ['fakeauth', 'faketoken', 'login', 'smarthome']) {
  assert.strictEqual(functions[name].__endpoint.platform, 'gcfv1');
  assert.deepStrictEqual(functions[name].__endpoint.httpsTrigger, {});
}

const reportState = functions.reportstate.__endpoint;
assert.strictEqual(reportState.platform, 'gcfv1');
assert.strictEqual(reportState.eventTrigger.eventType,
  'providers/google.firebase.database/eventTypes/ref.write');
assert.strictEqual(reportState.eventTrigger.eventFilters.resource,
  'projects/_/instances/demo-ecoforest-default-rtdb/refs/{usernameHash}/{deviceId}');

console.log('Function manifest tests passed');
