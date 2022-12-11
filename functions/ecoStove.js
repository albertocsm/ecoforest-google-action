const axios = require('axios');
const https = require('https');
const functions = require('firebase-functions');
const url = require('url');

class EcoStove {
    constructor() {

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

    _postData(address, data) {
        return this._httpClient.post(address, new url.URLSearchParams(data))
            .then(response => {
                return response
            })
            .catch(error => {
                //functions.logger.log(`_postData: ${JSON.stringify(error)}`);
                return error;
            });;
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
}

module.exports = EcoStove;