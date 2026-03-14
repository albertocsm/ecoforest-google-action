'use strict';

const DEVICE_ID = 'fireplace';
const POWER_MODE_NAME = 'power_mode';
const QUIET_TOGGLE_NAME = 'silence_toggle';
const POWER_LEVELS = Array.from({ length: 9 }, (_, index) => index + 1);
const DEFAULT_DEVICE_STATE = Object.freeze({
  on: false,
  power: 1,
  quiet: false,
});

const buildAvailablePowerSettings = () => POWER_LEVELS.map((level) => ({
  setting_name: `${level}_power`,
  setting_values: [{
    setting_synonym: [String(level), `level ${level}`],
    lang: 'en',
  }],
}));

const normalizePowerLevel = (powerLevel) => {
  const numericPower = Number(powerLevel);

  if (Number.isNaN(numericPower)) {
    return DEFAULT_DEVICE_STATE.power;
  }

  return Math.min(9, Math.max(1, numericPower));
};

const toModeSettingName = (powerLevel) => `${normalizePowerLevel(powerLevel)}_power`;

const parsePowerModeSetting = (settingName) => {
  const match = /^(\d+)_power$/.exec(settingName || '');

  if (!match) {
    throw new Error(`Unsupported power mode setting: ${settingName}`);
  }

  return normalizePowerLevel(match[1]);
};

const buildDeviceState = (state = {}) => ({
  on: Boolean(state.on),
  power: normalizePowerLevel(state.power),
  quiet: Boolean(state.quiet),
});

const statesEqual = (left = DEFAULT_DEVICE_STATE, right = DEFAULT_DEVICE_STATE) => {
  const normalizedLeft = buildDeviceState(left);
  const normalizedRight = buildDeviceState(right);

  return normalizedLeft.on === normalizedRight.on
    && normalizedLeft.power === normalizedRight.power
    && normalizedLeft.quiet === normalizedRight.quiet;
};

const toGoogleStates = (state = DEFAULT_DEVICE_STATE) => {
  const normalizedState = buildDeviceState(state);
  return {
    online: true,
    on: normalizedState.on,
    currentModeSettings: {
      [POWER_MODE_NAME]: toModeSettingName(normalizedState.power),
    },
    currentToggleSettings: {
      [QUIET_TOGGLE_NAME]: normalizedState.quiet,
    },
  };
};

const toGoogleQueryStates = (state = DEFAULT_DEVICE_STATE) => ({
  status: 'SUCCESS',
  ...toGoogleStates(state),
});

const buildSyncDevice = () => ({
  id: DEVICE_ID,
  type: 'action.devices.types.FIREPLACE',
  traits: [
    'action.devices.traits.OnOff',
    'action.devices.traits.Modes',
    'action.devices.traits.Toggles',
  ],
  name: {
    defaultNames: ['Ecoforest Fireplace'],
    name: 'Fireplace',
    nicknames: ['Fireplace'],
  },
  deviceInfo: {
    manufacturer: 'Ecoforest',
    model: 'fireplace',
    hwVersion: '1.0',
    swVersion: '1.0.1',
  },
  willReportState: true,
  attributes: {
    availableModes: [{
      name: POWER_MODE_NAME,
      name_values: [{
        name_synonym: ['Power', 'Level', 'Heat level'],
        lang: 'en',
      }],
      settings: buildAvailablePowerSettings(),
      ordered: true,
    }],
    commandOnlyModes: false,
    queryOnlyModes: false,
    availableToggles: [{
      name: QUIET_TOGGLE_NAME,
      name_values: [{
        name_synonym: ['Quiet', 'Silence', 'Silent mode'],
        lang: 'en',
      }],
    }],
    commandOnlyToggles: false,
    queryOnlyToggles: false,
    commandOnlyOnOff: false,
    queryOnlyOnOff: false,
  },
});

module.exports = {
  DEVICE_ID,
  DEFAULT_DEVICE_STATE,
  POWER_MODE_NAME,
  QUIET_TOGGLE_NAME,
  buildDeviceState,
  buildSyncDevice,
  normalizePowerLevel,
  parsePowerModeSetting,
  statesEqual,
  toGoogleQueryStates,
  toGoogleStates,
};
