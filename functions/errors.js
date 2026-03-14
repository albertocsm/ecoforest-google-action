'use strict';

const EXECUTE_ERROR_CODES = Object.freeze({
  DEVICE_OFFLINE: 'deviceOffline',
  HARD_ERROR: 'hardError',
  PROTOCOL_ERROR: 'protocolError',
});

const toExecuteErrorCode = (error) => {
  if (!error) {
    return EXECUTE_ERROR_CODES.HARD_ERROR;
  }

  if (error.response || error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
    return EXECUTE_ERROR_CODES.DEVICE_OFFLINE;
  }

  if (/Unsupported/.test(error.message || '')) {
    return EXECUTE_ERROR_CODES.PROTOCOL_ERROR;
  }

  return EXECUTE_ERROR_CODES.HARD_ERROR;
};

module.exports = {
  EXECUTE_ERROR_CODES,
  toExecuteErrorCode,
};
