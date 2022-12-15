const axios = require('axios');
const https = require('https');
const functions = require('firebase-functions');
const url = require('url');

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
            `${deviceApiBaseAddress}/recepcion_datos_4.cgi/`,
            {
                //idOperacion: '1004',
                //potencia: '9',
                idOperacion: '1013',
                on_off: 1
            }
        );
    }

    ecoTurnOff(deviceApiBaseAddress) {
        return this._postData(
            `${deviceApiBaseAddress}/recepcion_datos_4.cgi/`,
            {
                //idOperacion: '1004',
                //potencia: '3',
                idOperacion: '1013',
                on_off: 0
            }
        );
    }

    ecoGetStatus(deviceApiBaseAddress) {
        return this._postData(
            `${deviceApiBaseAddress}/recepcion_datos_4.cgi/`,
            {
                idOperacion: '1002'
            }
        ).then(response => {
            if (response.status !== 200) {
                return {}
            }
            return this._parseStatusResponse(response.data);
        });
    }

    _postData(address, data) {
        return this._httpClient.post(address, new url.URLSearchParams(data))
            .then(response => {
                if (response.status !== 200) {
                    functions.logger.warn(`_postData: invalid response | ${response.status} | ${response.statusText}`);
                }
                return response
            }, error => {
                functions.logger.error(`_postData: ${JSON.stringify(error)}`);
                return error;
            })
            .catch(error => {
                functions.logger.error(`_postData: ${JSON.stringify(error)}`);
                return error;
            });
    }

    _parseStatusResponse(value) {
        const isOn = value
            .split('\n')
            .find(line => line.startsWith('on_off'))
            .split('=')[1];

        const estado = value
            .split('\n')
            .find(line => line.startsWith('estado'))
            .split('=')[1];

        return {
            on: isOn === '0' || (isOn === '1' && estado == '8') ? false : true
        };
    }
}

module.exports = EcoStove;