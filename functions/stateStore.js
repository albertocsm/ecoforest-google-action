'use strict';

const { buildDeviceState, DEFAULT_DEVICE_STATE } = require('./deviceState.js');

const extractStoredDeviceState = (snapshotValue) => {
  if (!snapshotValue) {
    return null;
  }

  if (snapshotValue.state !== undefined) {
    return buildDeviceState(snapshotValue.state);
  }

  if (snapshotValue.OnOff !== undefined) {
    return buildDeviceState({
      ...DEFAULT_DEVICE_STATE,
      on: snapshotValue.OnOff.on,
    });
  }

  return null;
};

const getStoredDeviceState = async (firebaseRef, usernameHash, deviceId) => {
  const snapshot = await firebaseRef.child(usernameHash).child(deviceId).once('value');
  return snapshot.exists() ? extractStoredDeviceState(snapshot.val()) : null;
};

const saveDeviceState = (firebaseRef, usernameHash, deviceId, state) => firebaseRef
  .child(usernameHash)
  .child(deviceId)
  .set({
    state: buildDeviceState(state),
  });

module.exports = {
  extractStoredDeviceState,
  getStoredDeviceState,
  saveDeviceState,
};
