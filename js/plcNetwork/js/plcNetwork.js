const MSG_WIFI_CONNECTED = 'Connected! IP: ';
const FLAG_ETHERNET = 1 << 1;
const FLAG_WIFI = 1 << 0;
const MSG_TIMEOUT = 'Failed to connect in 10 seconds.'


/**
 * @class
 * Модуль обеспечивает работу платформы с чипом ESP8266,
 * обеспечивающим WiFi-соединение
 */
class ClassWifi {
    /**
     * @constructor
     */
    constructor (options) {
        //Синглтон
        if (this.Instance) {
            return this.Instance;
        } else {
            ClassWifi.prototype.Instance = this;
        }
        this._Name = 'Network';
        this._Core;
        this._ChipType;
        this._Ssid;
        this._Scan;
        this._Ip;
        this._BaseModule = options.baseModule;
    }
    /**
     * @method
     * Запускает колбэк на подключение к доступным известным сетям
     * @param {Object} nc
     * @param {Object} bus
     */
    Init(nc, bus, flag, callback) {
        if (flag & FLAG_ETHERNET) {
            this._ChipType = 'W5500';
            this.EtherSequence(nc, bus, callback);
        }
        else if (flag & FLAG_WIFI) {
            if (bus) {
                if (typeof this._BaseModule === 'undefined') {
                    H.Logger.Service.Log({service: this._Name, level: 'E', msg: 'Base module for WiFi is not specified. Aborting. . .'});
                    callback(false);
                    return;
                }
                this._ChipType = 'esp8266';
                this._Core = require(this._BaseModule).setup(bus, (err) => {
                    if (err) {
                        H.Logger.Service.Log({service: this._Name, level: 'E', msg: err});
                        callback(false);
                    }
                    else {
                        H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Using ESP8266.'});
                        this.WifiSequence(nc, callback);
                    }
                });
            }
            else {
                this._ChipType = 'esp32';
                this._Core = require('Wifi');
                H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Found build-in library.'});
                this.WifiSequence(nc, callback);
            }
        }
    }
    EtherSequence (nc, bus, callback) {
        let cs = eval(nc.bus.cs);
        
        if (!(cs instanceof Pin)) {
            H.Logger.Service.Log({service: this._Name, level: 'E', msg: `Chip Select pin ${cs} cannot be found!`});
            callback(false);
            return;
        }
        this._Core = require('WIZnet').connect(bus, cs);

        H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Connecting via Ethernet. . .'});

        //  this._Core.setHostname - отброшена, требует от 8 до 12 символов
        setTimeout(() => {
            this._Core.setIP();
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `Done! IP: ${this._Core.getIP().ip}`});
            callback(true);
            /*this._Core.setIP((err) => {
                if (err) {
                    Logger.Log(this._Name, Logger.LogLevel.WARN, `Failed to connect: ${err}`);
                    callback(false);
                }
                Logger.Log(this._Name, Logger.LogLevel.INFO, `Done! IP: ${this._Core.getIP().ip}`);
                this.SetNTP(nc, esp, () => {
                    callback(true);
                });
            });*/
        }, 5000);
    }
    /**
     * @method
     * Основной цикл подключения к точке доступа
     * @param {Object} nc           - объект с информацией о подключении
     * @param {Function} callback   - функция возврата 
     */
    WifiSequence (nc, callback) {
        this.GetAPCreds(nc, (pass) => {
            this.Connect(pass, (res) => {
                this.SetStatic(nc, () => {
                    callback(res);
                });
            });
        });
    }
    /**
     * @method
     * @description
     * Возвращает SSID и пароль точки доступа,
     * к которой происходит подключение
     * @param {Object} nc           - объект с информацией о подключении
     * @param {Function} callback   - функция, возвращающая пароль 
     */
    GetAPCreds(nc, callback) {
        if (nc.scan == -1) {
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Scanning the net. . .'});
            this._Core.scan((err, scn) => {
                this._Scan = scn;
                let pass = this.GetNetPassword(nc.accpoints);
                callback(pass);
            })
        }
        else {
            this._Ssid = nc.accpoints[nc.scan].ssid;
            let pass = nc.accpoints[nc.scan].pass;
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Net scan skipped.'});
            callback(pass);
        }
    }
    /**
     * @method
     * Устанавливает соединение с выбранной точкой доступа
     * @param {String} pass         - пароль к точке доступа 
     * @param {Function} callback   - функция возврата 
     */
    Connect(pass, callback) {
        H.Logger.Service.Log({service: this._Name, level: 'I', msg: `Got credentials. Attempting establish connection to ${this._Ssid}.`});
        let tOut = setTimeout (() => {
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_TIMEOUT});
            callback(false);
            return;
        }, 10000);
        this._Core.connect(this._Ssid, { password : pass }, (err) => {
            if (err) {
                clearTimeout(tOut);
                H.Logger.Service.Log({service: this._Name, level: 'E', msg: `Conncetion failed: ${err}`});
                callback(false);
            }
            else {
                this._Core.getIP((err, info) => {
                    if (err) {
                        H.Logger.Service.Log({service: this._Name, level: 'E', msg: 'Cannot get proveded IP'});
                        clearTimeout(tOut);
                        callback(false);
                    }
                    else {
                        clearTimeout(tOut);
                        this._Ip = info.ip;
                        H.Logger.Service.Log({service: this._Name, level: 'I', msg: `${MSG_WIFI_CONNECTED + this._Ip}`});
                        callback(true);
                    }
                });
            }
        });
    }
    /**
     * @method
     * Устанавливает статический IP, если выбрана соответствующая опция
     * @param {Object} nc           - объект с информацией о подключении
     * @param {Function} callback   - функция возврата 
     */
    SetStatic(nc, callback) {
        if (nc.usestatic == 1) {
            let settings = {ip: nc.staticconf.ip, gw: nc.staticconf.gw, netmask: nc.staticconf.nm};
            this._Core.setIP (settings, (err) => {
                if (err) {
                    H.Logger.Service.Log({service: this._Name, level: 'E', msg: `Failed to set static IP address`});
                }
                else {
                    H.Logger.Service.Log({service: this._Name, level: 'I', msg: `Static IP set to ${nc.staticconf.ip}`});
                }
                callback();
            });
        }
        else {
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Static IP setup skipped!'});
            callback();
        }
    }
    /**
     * @method
     * Находит соответствие между найденными сетями с теми, что описаны в объекте aps
     * @param {Object}      _aps
     * @returns {String}    pass
     */
    GetNetPassword(_aps) {
        let found = this._Scan.map(a => a.ssid);
        let pass;
        found.forEach(fName => {
            _aps.forEach(sName => {
                if (fName == sName.ssid) {
                    this._Ssid = sName.ssid;
                    pass = sName.pass;
                }                               
            });
        });
        return pass;
    }
    UDPHost(_host, _port) {
        /*if (esp == 'esp8266') {
            this._Core.setUDP(_host, _port);
        }*/
    }
    GetSocksData() {
        if (this._ChipType === 'esp8266') {
            this._Core.getSocks((d) => {
                H.Logger.Service.Log({service: this._Name, level: 'I', msg: `Socket data: ${d}`});
            });
        }
        else {
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `Socket info not supported for current chip!`});
        }
    }
}

exports = ClassWifi;