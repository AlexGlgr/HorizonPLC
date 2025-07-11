const MSG_ERR = 'NTP error: ';
const MSG_UPDATE = 'Time updated';
const MSG_SKT_CLOSED = 'UDP socket closed';
const MSG_TIMEOUT = 'Request timed out';

class ClassNTP {
    /**
     * @constructor
     */
    constructor (options) {
        //Синглтон
        if (this.Instance) {
            return this.Instance;
        } else {
            ClassNTP.prototype.Instance = this;
        }
        this._Name = 'NTP';
        this._Host = options.host || '127.0.0.1';
        this._Port = options.port || 123;
        this._Tz = options.tz || '0';
        Object.on('netReady', () => setTimeout(() => {this.SetNTP();}, Process.GetRandomStartupInterval()));
    }
    SetNTP() {
        let tOut = setTimeout (() => {
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_TIMEOUT});
            Object.emit('ntp_done');
        }, 5000);
        try {
            switch (H.Network.Service._ChipType) {
                case 'esp32':
                    H.Network.Service._Core.setSNTP(this._Host, this._Tz);
                    clearTimeout(tOut);
                    E.setTimeZone(this._Tz);
                    H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_UPDATE});
                    Object.emit('ntp_done');
                    break;
                case 'W5500':
                case 'esp8266':
                default:
                    const socket = require('dgram').createSocket('udp4');
                    let message = new Uint8Array(48);

                    socket.on('error', (err) => {
                        clearTimeout(tOut);
                        H.Logger.Service.Log({service: this._Name, level: 'E', msg: `${MSG_ERR} ${err.message}!`});
                        Object.emit('ntp_done');
                    });

                    socket.on('message', (msg, rinfo) => {
                        let buffer = E.toArrayBuffer(msg);
                        const dv = new DataView(buffer);
                        const timestamp = this.NTPtoMsecs(dv, 40);
                        setTime(timestamp / 1000);
                        clearTimeout(tOut);
                        E.setTimeZone(this._Tz);
                        H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_UPDATE});
                        Object.emit('ntp_done');
                    });
        
                    socket.on('close', () => {
                        clearTimeout(tOut);
                        H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_SKT_CLOSED});
                    });
                    
                    message[0] = (0 << 6) + (3 << 3) + (3 << 0);
                    for (let i = 1; i < 48; i++)
                        message[i] = 0;

                    socket.send(E.toString(message), this._Port, this._Host, (err, bytes) => {
                    if (err || bytes !== 48) {
                            H.Logger.Service.Log({service: this._Name, level: 'E', msg: `${MSG_ERR} ${err}`});
                        }
                    });
                    break;
            }
        }
        catch (e) {
            H.Logger.Service.Log({service: this._Name, level: 'E', msg: `${e}`});
        }
    }
    NTPtoMsecs(dv, offset) {
        let seconds = dv.getUint32(offset);
        let fraction = dv.getUint32(offset + 4);
        return (seconds - 2208988800 + (fraction / Math.pow(2, 32))) * 1000;
    }
}

exports = ClassNTP;