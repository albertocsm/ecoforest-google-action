const assert = require('assert');
const EcoStove = require('./ecoStove.js');
const {
  DEFAULT_DEVICE_STATE,
  buildDeviceState,
  parsePowerModeSetting,
  powerToBrightness,
  statesEqual,
  toGoogleStates,
} = require('./deviceState.js');
const {queryDevice, updateDevice} = require('./deviceControl.js');
const {extractStoredDeviceState} = require('./stateStore.js');
const {
  escapeHtml, readRequiredField, renderLoginPage,
} = require('./authHandlers.js');
const {EXECUTE_ERROR_CODES, toExecuteErrorCode} = require('./errors.js');
const {stripAuthorizationHeader, getUserHash, delay} = require('./utils.js');

const testParseStatusResponse = () => {
  const ecoStove = new EcoStove();
  const result = ecoStove._parseStatusResponse([
    'error_MODO_on_off=0',
    'on_off=1',
    'modo_operacion=0',
    'modo_func=1',
    'estado=7',
    'consigna_potencia=6',
    'consigna_temperatura=21.0',
    'temperatura=-30.0',
    'temperatura_ext=-30.0',
    'mantenimiento=0',
    'cal=0',
    'eco=1',
    '0',
  ].join('\n'));

  assert.deepStrictEqual(result, {
    on: true,
    power: 6,
    quiet: true,
  });
};

const testParseStatusResponseWhenOff = () => {
  const ecoStove = new EcoStove();
  const result = ecoStove._parseStatusResponse([
    'error_MODO_on_off=0',
    'on_off=1',
    'estado=8',
    'consigna_potencia=3',
    'eco=0',
  ].join('\n'));

  assert.deepStrictEqual(result, {
    on: false,
    power: 3,
    quiet: false,
  });
};

const testCommandPayloads = async () => {
  const ecoStove = new EcoStove();
  const capturedCalls = [];

  ecoStove._postData = async (address, data) => {
    capturedCalls.push({address, data});
    return {status: 200, data: 'ok'};
  };

  const baseUrl = 'https://device.example:8000';
  await ecoStove.ecoSetPower(baseUrl, 9);
  await ecoStove.ecoSetQuietMode(baseUrl, true);
  await ecoStove.ecoSetQuietMode(baseUrl, false);

  assert.deepStrictEqual(capturedCalls, [
    {
      address: 'https://device.example:8000/recepcion_datos_4.cgi/',
      data: {idOperacion: '1004', potencia: '9'},
    },
    {
      address: 'https://device.example:8000/recepcion_datos_4.cgi/',
      data: {idOperacion: '1023', Vent: '1'},
    },
    {
      address: 'https://device.example:8000/recepcion_datos_4.cgi/',
      data: {idOperacion: '1023', Vent: '0'},
    },
  ]);
};

const testDeviceStateHelpers = () => {
  assert.deepStrictEqual(buildDeviceState({}), DEFAULT_DEVICE_STATE);
  assert.strictEqual(parsePowerModeSetting('9_power'), 9);
  assert.strictEqual(parsePowerModeSetting('99_power'), 9);
  assert.strictEqual(powerToBrightness(1, true), 10);
  assert.strictEqual(powerToBrightness(9, true), 90);
  assert.strictEqual(powerToBrightness(9, false), 0);
  assert.throws(() => parsePowerModeSetting('banana'));
  assert.ok(statesEqual(
      {on: true, power: 2, quiet: false},
      {on: true, power: 2, quiet: false},
  ));
  assert.ok(!statesEqual(
      {on: true, power: 2, quiet: false},
      {on: true, power: 3, quiet: false},
  ));
  assert.deepStrictEqual(toGoogleStates({on: true, power: 4, quiet: true}), {
    online: true,
    on: true,
    brightness: 40,
    currentModeSettings: {
      power_mode: '4_power',
    },
    currentToggleSettings: {
      silence_toggle: true,
    },
  });
};

const testStateStoreCompatibility = () => {
  assert.deepStrictEqual(extractStoredDeviceState({
    state: {on: true, power: 7, quiet: true},
  }), {
    on: true,
    power: 7,
    quiet: true,
  });

  assert.deepStrictEqual(extractStoredDeviceState({
    OnOff: {on: true},
  }), {
    on: true,
    power: 1,
    quiet: false,
  });

  assert.strictEqual(extractStoredDeviceState({}), null);
};

const testUtils = async () => {
  const headers = {
    authorization: 'Bearer https://serial:password@192.168.1.97:8000',
  };

  assert.strictEqual(
      stripAuthorizationHeader(headers),
      'https://serial:password@192.168.1.97:8000',
  );
  assert.strictEqual(getUserHash(headers), 'ea91fcb3e99d159ea14fdb5501bc2162');
  assert.throws(() => stripAuthorizationHeader({authorization: 'Bearer nope'}));

  const start = Date.now();
  await delay(5);
  assert.ok(Date.now() >= start);
};

const testUpdateDeviceHelpers = async () => {
  const writes = [];
  const firebaseRef = {
    child(key) {
      const currentPath = [key];
      return {
        child(nextKey) {
          currentPath.push(nextKey);
          return this;
        },
        once: async () => ({
          exists: () => true,
          val: () => ({state: {on: true, power: 2, quiet: false}}),
        }),
        set: async (value) => {
          writes.push({path: [...currentPath], value});
        },
      };
    },
  };

  const ecoStove = {
    ecoTurnOn: async () => {},
    ecoTurnOff: async () => {},
    ecoSetPower: async (base, power) => writes.push({powerCall: [base, power]}),
    ecoSetQuietMode: async (base, quiet) =>
      writes.push({quietCall: [base, quiet]}),
    ecoGetStatus: async () => ({on: true, power: 3, quiet: true}),
  };

  const logger = {info() {}, warn() {}, error() {}};

  const updateResult = await updateDevice({
    execution: {
      command: 'action.devices.commands.SetModes',
      params: {updateModeSettings: {power_mode: '5_power'}},
    },
    usernameHash: 'user',
    deviceId: 'fireplace',
    deviceApiBaseAddress: 'https://device',
    ecoStove,
    firebaseRef,
    logger,
  });

  assert.deepStrictEqual(updateResult, {
    online: true,
    on: true,
    brightness: 50,
    currentModeSettings: {power_mode: '5_power'},
    currentToggleSettings: {silence_toggle: false},
  });

  const brightnessNoopResult = await updateDevice({
    execution: {
      command: 'action.devices.commands.BrightnessAbsolute',
      params: {brightness: 90},
    },
    usernameHash: 'user',
    deviceId: 'fireplace',
    deviceApiBaseAddress: 'https://device',
    ecoStove,
    firebaseRef,
    logger,
  });

  assert.deepStrictEqual(brightnessNoopResult, {
    online: true,
    on: true,
    brightness: 20,
    currentModeSettings: {power_mode: '2_power'},
    currentToggleSettings: {silence_toggle: false},
  });

  assert.ok(!writes.some((entry) =>
    entry.powerCall && entry.powerCall[1] === 90));

  const queryResult = await queryDevice({
    usernameHash: 'user',
    deviceId: 'fireplace',
    deviceApiBaseAddress: 'https://device',
    ecoStove,
    firebaseRef,
    logger,
    delay: async () => {},
  });

  assert.strictEqual(queryResult.status, 'SUCCESS');
  assert.strictEqual(queryResult.on, true);
  assert.strictEqual(queryResult.brightness, 20);
};

const testAuthHandlers = () => {
  const html = renderLoginPage({responseurl: 'abc', state: '123'});
  assert.ok(html.includes('responseurl'));
  assert.ok(html.includes('state'));
  assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
  assert.strictEqual(readRequiredField({foo: ' bar '}, 'foo'), 'bar');
  assert.throws(() => readRequiredField({}, 'foo'));
};

const testErrorMapping = () => {
  assert.strictEqual(
      toExecuteErrorCode(new Error('Unsupported command')),
      EXECUTE_ERROR_CODES.PROTOCOL_ERROR,
  );
  assert.strictEqual(
      toExecuteErrorCode({code: 'ECONNABORTED'}),
      EXECUTE_ERROR_CODES.DEVICE_OFFLINE,
  );
  assert.strictEqual(
      toExecuteErrorCode(new Error('boom')),
      EXECUTE_ERROR_CODES.HARD_ERROR,
  );
};

const run = async () => {
  testParseStatusResponse();
  testParseStatusResponseWhenOff();
  await testCommandPayloads();
  testDeviceStateHelpers();
  testStateStoreCompatibility();
  await testUtils();
  await testUpdateDeviceHelpers();
  testAuthHandlers();
  testErrorMapping();
  console.log('All tests passed');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
