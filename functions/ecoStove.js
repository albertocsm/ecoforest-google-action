const axios = require('axios');
const https = require('https');
const functions = require('firebase-functions');
const url = require('url');

const ECOFOREST_ENDPOINT_PATH = '/recepcion_datos_4.cgi/';
const OPERATIONS = Object.freeze({
    STATUS: '1002',
    SET_POWER: '1004',
    SET_ON_OFF: '1013',
    SET_QUIET: '1023',
});

class EcoStove {
    constructor() {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        this._httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true
        });
        this._httpClient = axios.create({
            agent: this._httpsAgent,
            timeout: 10000,
            proxy: false,
            transformResponse: {},
            responseType: 'text',
            headers: {
                'Accept': '*/*',
                'Content-type': ' application/x-www-form-urlencoded; charset=utf-8'
            },
        });
    }

    ecoTurnOn(deviceApiBaseAddress) {

        return this._postData(
            `${deviceApiBaseAddress}${ECOFOREST_ENDPOINT_PATH}`,
            {
                idOperacion: OPERATIONS.SET_ON_OFF,
                on_off: 1
            }
        );
    }

    ecoTurnOff(deviceApiBaseAddress) {
        return this._postData(
            `${deviceApiBaseAddress}${ECOFOREST_ENDPOINT_PATH}`,
            {
                idOperacion: OPERATIONS.SET_ON_OFF,
                on_off: 0
            }
        );
    }

    ecoSetPower(deviceApiBaseAddress, powerLevel) {
        return this._postData(
            `${deviceApiBaseAddress}${ECOFOREST_ENDPOINT_PATH}`,
            {
                idOperacion: OPERATIONS.SET_POWER,
                potencia: String(powerLevel)
            }
        );
    }

    ecoSetQuietMode(deviceApiBaseAddress, enabled) {
        return this._postData(
            `${deviceApiBaseAddress}${ECOFOREST_ENDPOINT_PATH}`,
            {
                idOperacion: OPERATIONS.SET_QUIET,
                Vent: enabled ? '1' : '0'
            }
        );
    }

    ecoGetStatus(deviceApiBaseAddress) {
        return this._postData(
            `${deviceApiBaseAddress}${ECOFOREST_ENDPOINT_PATH}`,
            {
                idOperacion: OPERATIONS.STATUS
            }
        ).then(response => {
            return this._parseStatusResponse(response.data);
        });
    }

    async _postData(address, data) {
        try {
            const response = await this._httpClient.post(address, new url.URLSearchParams(data));

            if (response.status !== 200) {
                throw new Error(`Unexpected response status ${response.status} ${response.statusText}`);
            }

            return response;
        }
        catch (error) {
            functions.logger.error(`_postData: request failed | ${error.message}`);
            throw error;
        }
    }

    _parseStatusResponse(value) {
        const parsed = this._parseKeyValueResponse(value);
        const isOn = parsed.on_off;
        const estado = parsed.estado;
        const power = Number(parsed.consigna_potencia);

        return {
            on: isOn === '0' || (isOn === '1' && estado == '8') ? false : true,
            power: Number.isNaN(power) ? 1 : power,
            quiet: parsed.eco === '1'
        };
    }

    _parseKeyValueResponse(value) {
        return value
            .split('\n')
            .filter(line => line.includes('='))
            .reduce((result, line) => {
                const [key, ...rest] = line.split('=');
                result[key] = rest.join('=');
                return result;
            }, {});
    }
}

module.exports = EcoStove;
