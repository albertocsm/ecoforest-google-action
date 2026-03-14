'use strict';

const {
  DEFAULT_DEVICE_STATE,
  POWER_MODE_NAME,
  QUIET_TOGGLE_NAME,
  buildDeviceState,
  parsePowerModeSetting,
  statesEqual,
  toGoogleQueryStates,
  toGoogleStates,
} = require('./deviceState.js');
const { getStoredDeviceState, saveDeviceState } = require('./stateStore.js');

const updateDevice = async ({ execution, usernameHash, deviceId, deviceApiBaseAddress, ecoStove, firebaseRef, logger }) => {
  const { params, command } = execution;
  const currentState = await getStoredDeviceState(firebaseRef, usernameHash, deviceId) || DEFAULT_DEVICE_STATE;
  let state;

  switch (command) {
    case 'action.devices.commands.OnOff':
      state = buildDeviceState({
        ...currentState,
        on: params.on,
      });

      if (params.on === true) {
        await ecoStove.ecoSetQuietMode(deviceApiBaseAddress, false);
        await ecoStove.ecoTurnOn(deviceApiBaseAddress);
      } else {
        await ecoStove.ecoTurnOff(deviceApiBaseAddress);
      }
      break;
    case 'action.devices.commands.SetModes': {
      const powerLevel = parsePowerModeSetting(params.updateModeSettings[POWER_MODE_NAME]);

      await ecoStove.ecoSetPower(deviceApiBaseAddress, powerLevel);
      state = buildDeviceState({
        ...currentState,
        power: powerLevel,
      });
      break;
    }
    case 'action.devices.commands.SetToggles': {
      const quiet = Boolean(params.updateToggleSettings[QUIET_TOGGLE_NAME]);

      await ecoStove.ecoSetQuietMode(deviceApiBaseAddress, quiet);
      state = buildDeviceState({
        ...currentState,
        quiet,
      });
      break;
    }
    default:
      throw new Error(`Unsupported command: ${command}`);
  }

  await saveDeviceState(firebaseRef, usernameHash, deviceId, state);
  return toGoogleStates(state);
};

const queryDevice = async ({ usernameHash, deviceId, deviceApiBaseAddress, ecoStove, firebaseRef, logger, delay }) => {
  try {
    let firebaseData = await getStoredDeviceState(firebaseRef, usernameHash, deviceId);

    if (firebaseData === null) {
      firebaseData = buildDeviceState(DEFAULT_DEVICE_STATE);
      logger.info(`queryDevice: new user [${usernameHash}]!!!`);
      await saveDeviceState(firebaseRef, usernameHash, deviceId, firebaseData);
    }

    ecoStove.ecoGetStatus(deviceApiBaseAddress)
      .then((liveStatus) => {
        if (liveStatus.on === undefined) {
          logger.warn('queryDevice: invalid device live status...');
          return;
        }

        const normalizedLiveStatus = buildDeviceState(liveStatus);
        if (statesEqual(firebaseData, normalizedLiveStatus)) {
          return;
        }

        logger.info(`queryDevice: firebase de-sync for user [${usernameHash}]`);
        delay(1000)
          .then(() => saveDeviceState(firebaseRef, usernameHash, deviceId, normalizedLiveStatus))
          .catch((error) => logger.error('queryDevice: failed to persist live state', error));
      })
      .catch((error) => logger.error('queryDevice: live status refresh failed', error));

    return toGoogleQueryStates(firebaseData);
  }
  catch (err) {
    logger.error('queryDevice: failed!!! returning a default device state', err);
    return toGoogleQueryStates(DEFAULT_DEVICE_STATE);
  }
};

module.exports = {
  queryDevice,
  updateDevice,
};
