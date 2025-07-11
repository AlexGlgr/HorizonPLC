/**
 * Константы
 */
// Конфигурационные файлы
const STORAGE = 'Storage';
const WIFI = 'Wifi';
const WIZNET = 'WIZnet';
const MAIN_CONFIG = 'init.json';
const SYSTEM_CONFIG = 'system.json';
const DEVICE_CONFIG = 'device.json';
const NETWORK_CONFIG = 'network.json';
const NETSETUP_CONFIG = 'netsetup.json';
const SERVICE_CONFIG = 'services.json';
const MQTT_CONFIG = 'MQTTClientConfig.json';

const SENSOR_ANCESTOR = 'plcSensor.min.js';
const ACTUATOR_ANCESTOR = 'plcActuator.min.js';

// Ноды
const BUS_NODE = 'bus';
const RTC_NODE = 'SysClock';
const DEFAULT_FILE = '.bootcde';

// Сообщения
const MSG_STARTUP = 'Starting up framework\n';
const MSG_SENSOR_ANCESTOR = 'File \'plcSensor.min.js\' is absent. You won\'t be able to create any sensors!';
const MSG_ACTUATOR_ANCESTOR = 'File \'plcActuator.min.js\' is absent. You won\'t be able to create any actuators!';
const MSG_NO_NETWORK_CONFIG = 'Cannot find \'network.json\'. Skipping network setup';
const MSG_NO_NETSETUP_CONFIG = 'Cannot find \'netsetup.json\'. Skipping network setup';
const MSG_BOOTUP_SUCCESS = 'Boot up sequence complete!';
const MSG_BOOTUP_ABORT = 'Not all primary services started or no primary services at all. Aborting. . .';
const MSG_RTC_SUCCESS = 'System time is set via RTC clock module';
const MSG_RTC_COMPLETE = 'RTC check complete. Clock syncronized';
const MSG_RTC_ADJUSTED = 'Date of RTC clock module adjusted';
const MSG_RTC_NOT_FOUND = 'RTC clock not found!';
const MSG_RTC_NOT_SPECIFIED = 'RTC clock is not specified in system.json!';
const MSG_FREE_FLASH = 'Currently free flash memory:';
const MSG_LOW_FLASH = 'Low free flash memory. Try clearing log files.'
const MSG_TIME_SET_FAIL = 'Failed to properly set system time!';
const MSG_TIME_SET_SUCCESS = 'System time set to';
const MSG_DRIVER_ERROR = 'Error loading driver';
const MSG_DRIVER_SUCCESS = 'Channels loaded:';
const MSG_DRIVER_WARNING = 'channel already exist!';
const MSG_MODULE_LOADED = 'loaded.';
const MSG_MODULE_FAILED = 'failed to load. Reason:';
const MSG_MODULE_UNDEFINED = 'Undefined in config file!';
const MSG_NET_STARTUP = 'Starting up Network. . .';
const MSG_NETWORK_SKIP = 'Network connection not specified. Skipping.'
const MSG_BOARD_ID = 'Board ID:';
const MSG_LOAD_FILE = 'LoadFile set to:';
const MSG_SUB = 'Subscribed to system events.'
const MSG_EMPTY = '';
const MSG_MISSING = 'Missing';
const MSG_SPI_FAILED = 'Failed to set up SPI bus.'
const MSG_NOT_VALID_PIN = 'is not a valid pin';

const MSG_FATAL_CANT_FIND = 'Process | CRITICAL | Cannot find';

const TS_JAN_FIRST_2010 = 1262289600;
const TS_JAN_FIRST_2100 = 4099680000;

/**
 * @class
 * Модуль Process реализует функционал, необходимый при старте платформы.
 * Загрузка необходимых функциональных модулей, инициализация глабльных объектов,
 * чтение конфигурационных файлов
 */
class ClassProcess {
    /**
     * @constructor
     */
    constructor() {
        if (!process.env.MODULES.includes(STORAGE))
            throw `${MSG_FATAL_CANT_FIND} ${STORAGE}`;

    /** Board name and identifications */
        this._FileReader = require(STORAGE);
        if (!(this._FileReader.list().includes(MAIN_CONFIG)))
            throw `${MSG_FATAL_CANT_FIND} ${MAIN_CONFIG}`;

        if (!(this._FileReader.list().includes(SYSTEM_CONFIG)))
            throw `${MSG_FATAL_CANT_FIND} ${SYSTEM_CONFIG}`;

        if (!(this._FileReader.list().includes(DEVICE_CONFIG)))
            throw `${MSG_FATAL_CANT_FIND} ${DEVICE_CONFIG}`;

        if (!(this._FileReader.list().includes(SERVICE_CONFIG)))
            throw `${MSG_FATAL_CANT_FIND} ${SERVICE_CONFIG}`;
        
        this._LoadFile = this._FileReader.readJSON(MAIN_CONFIG, true).application;
        this._DeviceConfig = this._FileReader.readJSON(MAIN_CONFIG, true).deviceConf;
        if (!this.IsProgramInConfig(this._DeviceConfig) || typeof this._DeviceConfig === 'undefined') {
            throw `${MSG_FATAL_CANT_FIND} ${this._DeviceConfig} configuration.`;
        }

        this._RTC = undefined;
        this._HaveNet = false;
        this._HaveConsole = false;
        this._Name = 'Process';
        this._IsFinished = false;
    }
    /**
     * @method
     * Запуск Process, загрузка базовых модулей
     */
    Run() {
        if (this._LoadFile != this.GetAppName()) {
            load(this._LoadFile);
        }
        else {
            let H = this._FileReader.readJSON(SERVICE_CONFIG, true);
            let startUpFlag = 0;
            Object.defineProperty(global, 'Process', ({
                get: () => this
            }));
            Object.defineProperty(global, 'H', ({
                get: () => H
            }));
            this.PrintLogo();
            this._BoardName = `${this._FileReader.readJSON(MAIN_CONFIG, true).name || MSG_EMPTY}`;

            this._FileReader.open('syslog.txt', 'a').write(MSG_STARTUP);

            Object.values(H)
                .sort((a,b) => a.InitOrder - b.InitOrder)
                .forEach((serv) => {
                    try {
                        serv.Service = new (require(serv.Dependency[0]))(serv.AdvancedOptions);
                        this.SystemMessage('INFO', this.GetSuccessString(serv.Dependency[0]));
                        serv.Status = 'running';
                        startUpFlag |= 1;
                    }
                    catch (e) {
                        if (serv.Importance === 'Primary') {
                            this.SystemMessage('ERROR', this.GetFailString(serv.Dependency[0], e));
                            serv.ErrorMsg = e.toString();
                            startUpFlag |= 2;
                        }
                        else if (serv.Importance === 'Auxilary') {
                             this.SystemMessage('WARN', this.GetFailString(serv.Dependency[0], e));
                            serv.ErrorMsg = e.toString();
                        }
                        else this.SystemMessage('WANR', 'Unknown service format', e)                        
                    }
            });

            console.log(startUpFlag);

            if (startUpFlag != 1) {
                this.SystemMessage('ERROR', MSG_BOOTUP_ABORT);
                load('SysDeadEnd');
                return;
            }

            //if (H.RouteREPL.Service.isREPLConnected(this._HaveConsole));

            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `${MSG_BOARD_ID} ${this._BoardName} (${process.env.BOARD} ${process.env.SERIAL})`});
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `${MSG_LOAD_FILE} ${this._LoadFile}`});
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `${MSG_FREE_FLASH} ${this._FileReader.getFree()} bytes.`});
            if (this._FileReader.getFree() < 100) {
                H.Logger.Service.Log({service: this._Name, level: 'W', msg: `${MSG_LOW_FLASH}`});
            }

            delete this._LoadFile;

            if (!(this._FileReader.list().includes(SENSOR_ANCESTOR))) {
                H.Logger.Service.Log({service: this._Name, level: 'N', msg: MSG_SENSOR_ANCESTOR});
            }
            if (!(this._FileReader.list().includes(ACTUATOR_ANCESTOR))) {
                H.Logger.Service.Log({service: this._Name, level: 'N', msg: MSG_ACTUATOR_ANCESTOR});
            }

            this.InitializeModuleDrives();
            this.InitSysEvents();            

            /** Internet connection and system time*/
            try {
                if (!(this._FileReader.list().includes(NETWORK_CONFIG)))
                    throw MSG_NO_NETWORK_CONFIG;
                if (!(this._FileReader.list().includes(NETSETUP_CONFIG)))
                    throw MSG_NO_NETSETUP_CONFIG;

                let ethconf = this._FileReader.readJSON(NETWORK_CONFIG, true).eth;
                let wificonf = this._FileReader.readJSON(NETWORK_CONFIG, true).wifi;
                let setconf = this._FileReader.readJSON(NETSETUP_CONFIG, true)
                let netconf;
                let bus;
                let flag;

                if (ethconf.useEth == 1) {
                    if (!process.env.MODULES.includes(WIZNET)) {
                        throw `${MSG_MISSING} ${WIZNET}`;
                    }
                    netconf = ethconf;
                    H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_NET_STARTUP});
                    flag = 1 << 1;
                    let ethbus = netconf.bus;
                    bus = SPIbus._SPIbus[ethbus.index].IDbus;
                    let pins = [ethbus.mosi, ethbus.miso, ethbus.sck];
                    pins.forEach(pin => {
                        try {
                            let p = eval(pin);
                            if (!(p instanceof Pin)) {
                                throw 0;
                            }
                            pin = p;
                        }
                        catch (e) {
                            throw `${MSG_SPI_FAILED} ${pin} ${MSG_NOT_VALID_PIN}`;
                        }
                    })
                    try {
                        bus.setup({
                            baud: ethbus.baudrate,
                            mosi: pins[0],
                            miso: pins[1],
                            sck: pins[2]
                        });
                    }
                    catch (e) {
                        throw e;
                    }
                }
                else if (wificonf.useWifi == 1) {
                    netconf = wificonf;
                    flag = 1 << 0;
                    H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_NET_STARTUP});
                    if (!process.env.MODULES.includes(WIFI)) {
                        let wfbus = netconf.bus;
                        bus = H.UARTbus.Service._UARTbus[wfbus.index].IDbus;
                        bus.setup(wfbus.baudrate);
                    }
                }
                else {
                    throw `${MSG_NETWORK_SKIP}`;
                }

                try {
                    H.Network.Service.Init(setconf, bus, flag, (res) => {
                        if (res) {
                           // H.Logger.Service.InitGraylogOutput(H.Logger.AdvancedOptions);
                            
                        }
                        if (!H.NTP || H.NTP.Status !== 'running')
                            this.WrapStartUp();                      
                    });
                }
                catch (e) {
                    throw e;
                }
            }
            catch (e) {
                H.Logger.Service.Log({service: this._Name, level: 'I', msg: e.toString()});
                this.WrapStartUp();
            }
        }
    }
    WrapStartUp() {
        if (!this._IsFinished) {
            this._IsFinished = true;
            this.SetSystemTime();
            this.CheckSystemTime();
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_BOOTUP_SUCCESS});
            delete this._FileReader;
            Object.emit('complete');
        }
    }
    InitSysEvents() {
        let on = false;
        let interval;

        Object.on('complete', () => {
            if (sysbuzz) {sysbuzz.SetValue(0.4)}
            if (sysled) {sysled.SetValue(1)}
            if(Process._HaveNet) {
                setTimeout(() => {
                    if (sysbuzz) {sysbuzz.SetValue(0.8)}
                }, 100);
            }
            setTimeout(() => {
                if (sysbuzz) {sysbuzz.SetValue(0)}                
            }, 200);
        });

        Object.on('connect', () => {
            if (sysbuzz) {sysbuzz.SetValue(0.5)}
            setTimeout(() => {
                if (sysbuzz) {sysbuzz.SetValue(0.9)}
                setTimeout(() => {
                    if (sysbuzz) {sysbuzz.SetValue(1)}
                    setTimeout(() => {
                        if (sysbuzz) {sysbuzz.SetValue(0)}
                    }, 100);
                }, 100);
            }, 500);
            interval = setInterval(() => {
                on = !on;
                if (sysled) {sysled.SetValue(0.5 + (0.5 * on))}
            }, 500);
        });

        Object.on('disconnect', () => {
            if (sysbuzz) {sysbuzz.SetValue(1)}
            setTimeout(() => {
                if (sysbuzz) {sysbuzz.SetValue(0.6)}
                setTimeout(() => {
                    if (sysbuzz) {sysbuzz.SetValue(0.5)}
                    setTimeout(() => {
                        if (sysbuzz) {sysbuzz.SetValue(0)}
                    }, 100);
                }, 100);
            }, 500);
            clearInterval(interval);
            if (sysled) {sysled.SetValue(1)}
        });

        Object.on('ntp_done', () => {
            this.WrapStartUp();
        });

        Object.on('proc-get-systemdata', () => {
            let packet = {com: 'proc-return-systemdata', args: [this._BoardName, process.env.SERIAL]};
            Object.emit('proc-return', packet);
        });
        H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_SUB});
    }
    /**
     * @method
     * Инициализирует модули, описанные в выбранной конфигурации
     */
    InitializeModuleDrives() {
        let conf = Object.assign(this._FileReader.readJSON(DEVICE_CONFIG, true)[this._DeviceConfig], this._FileReader.readJSON(SYSTEM_CONFIG, true));
        let driverArr = new Array();

        Object.keys(conf).forEach(driver => {
            if (driver != BUS_NODE)
            {
                try {
                    let instance = H.DeviceManager.Service.CreateDevice(driver);
                    instance.forEach(channel => {
                        if (driverArr.includes(channel.Name)) {
                            H.Logger.Service.Log({service: this._Name, level: 'W', msg: `${channel.Name} ${MSG_DRIVER_WARNING}`});
                        }
                        else {
                            Object.defineProperty(global, channel.Name, ({
                                get: () => channel
                            }));
                            driverArr.push(channel.Name);
                        }
                    })
                    
                }
                catch (e) {
                    H.Logger.Service.Log({service: this._Name, level: 'E', msg: `${MSG_DRIVER_ERROR} ${driver} ${e.message}`});
                }
            }
        })
        if (driverArr.length > 0) {
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `${MSG_DRIVER_SUCCESS} ${driverArr.join()}`});
        }
    }
    /**
     * @method
     * Возвращает название исполняемой программы.
     * @returns 
     */
    GetAppName() {
        try {
            return __FILE__;
        } catch (e) {
            return DEFAULT_FILE;
        }
    }
    /**
     * @method
     * Возвращает имя платы
     * @returns {String}  - имя платы
     */
    GetBoardName() {
        return `${process.env.BOARD} ${process.env.SERIAL} ${this._BoardName}`;
    }
    /**
     * @method
     * Возвращает конфиг сенсора/актуатора по его id. 
     * @param {String} id 
     * @returns 
     */
    GetDeviceConfig(id) {
        if (id.startsWith('Sys')) {
            return require(STORAGE).readJSON(SYSTEM_CONFIG, true)[id];
        }
        else
            return (((require(STORAGE).readJSON(DEVICE_CONFIG, true) || {})[this._DeviceConfig]) || {})[id];
    }
    /**
     * @method
     * Возвращает объект с настройками для всех шин в проекте.
     * @returns {Object}
     */
    GetBusesConfig(){
        return require(STORAGE).readJSON(DEVICE_CONFIG, true)[this._DeviceConfig][BUS_NODE];
    }
    /**
     * @method 
     * Выполняет чтение json-конфига, хранящего подписки на службы и соответствующие этим подпискам MQTT-топики.
     * @returns {Object}
     */
    GetMQTTClientConfig() {
        return require(STORAGE).readJSON(MQTT_CONFIG, true)[this._DeviceConfig];
    }
    /**
     * @method
     * Устанавливает время системы и/через датчик RTC
     */
    SetSystemTime() {
        try {
            let conf = require(STORAGE).readJSON(SYSTEM_CONFIG, true);

            if (!(Object.keys(conf).includes(RTC_NODE))) {
                throw {message: MSG_RTC_NOT_SPECIFIED};
            }

            this._RTC = H.DeviceManager.Service.CreateDevice(RTC_NODE, conf[RTC_NODE])[0];
            let ts = this._RTC._Sensor.GetTimeUnix();
            let sys_t = Math.floor(new Date().getTime() / 1000);

            if (ts <= TS_JAN_FIRST_2010 || ts >= TS_JAN_FIRST_2100) {
                this._RTC._Sensor.SetTime(new Date());
                ts = this._RTC._Sensor.GetTimeUnix();
                if (ts <= TS_JAN_FIRST_2010 || ts >= TS_JAN_FIRST_2100) {
                   throw {message: MSG_RTC_NOT_FOUND};
                }
                H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_RTC_ADJUSTED});
            }
            if (sys_t <= TS_JAN_FIRST_2010 || sys_t >= TS_JAN_FIRST_2100) {
                setTime(ts);
                H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_RTC_SUCCESS});
            }
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: MSG_RTC_COMPLETE});
        }
        catch (e) {
            H.Logger.Service.Log({service: this._Name, level: 'E', msg: e.message});
        }
    }
    /**
     * @method
     * Проверяет валидность установленного системного времени
     */
    CheckSystemTime() {
        let final_t_check = Math.floor(new Date().getTime() / 1000);
        if (final_t_check <= TS_JAN_FIRST_2010 || final_t_check >= TS_JAN_FIRST_2100) {
            H.Logger.Service.Log({service: this._Name, level: 'W', msg: MSG_TIME_SET_FAIL});
        }
        else {
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `${MSG_TIME_SET_SUCCESS} ${this.GetSystemTime()}`});
        }
    }
    /**
     * @method
     * Возвращает дату и время системы в определённом формате
     * @returns {String} 
     */
    GetSystemTime() {
        let date = new Date();
        return (date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).substr(-2) +
          "-" + ("0" + date.getDate()).substr(-2) + " " + ("0" + date.getHours()).substr(-2) +
          ":" + ("0" + date.getMinutes()).substr(-2) + ":" + ("0" + date.getSeconds()).substr(-2));
    }
    /**
     * @method
     * Возвращает true, если в конфигурации присутствует указанный файл
     * @param {String} filename - имя проверяемой программы
     * @returns {Boolean} result 
     */
    IsProgramInConfig(filename) {
        return Boolean(this._FileReader.readJSON(DEVICE_CONFIG, true)[filename]);
    }
    /**
     * @method
     * Возвращает строку для логгера в случае усепеха
     * @param {String} moduleName - имя модуля
     * @returns {String} res
     */
    GetSuccessString(moduleName) {
        return `${moduleName.substring(0, moduleName.indexOf("."))} ${MSG_MODULE_LOADED}`;
    }
     /**
     * @method
     * Возвращает строку для логгера в случае провала
     * @param {String} moduleName - имя модуля
     * @param {String} fileName - имя файла
     * @returns {String} res
     */
     GetFailString(moduleName, reason) {
        if (typeof moduleName === 'undefined') {
            return `${moduleName}: ${MSG_MODULE_UNDEFINED}`;
        } else {
            return `${moduleName.substring(0, moduleName.indexOf("."))} ${MSG_MODULE_FAILED} ${reason.message}`;
        }
    }
    PrintLogo() {
        console.log("    __  __           _                          _______");
        console.log("   / / / /___  _____(_)___  ____  ____         / / ___/");
        console.log("  / /_/ / __ \\/ ___/ /_  / / __ \\/ __ \\   __  / /\\__ \\ ");
        console.log(" / __  / /_/ / /  / / / /_/ /_/ / / / /  / /_/ /___/ / ");
        console.log("/_/ /_/\\____/_/  /_/ /___/\\____/_/ /_/   \\____//____/  ");
        console.log("");
        console.log('Based on Horizon Automated v0.9.1');
    }
    SystemMessage(_lvl, _msg) {
        try {
            H.Logger.Service.Log({service: this._Name, level: _lvl, msg: _msg});
        }
        catch (e) {
            console.log(`Error ${e}`);
        }
    }
    UpdateNetstart(nc) {
        this._FileReader.writeJSON(NETSETUP_CONFIG, nc);
    }
    GetRandomStartupInterval() {
        return Math.floor(Math.random() * 5000) + 200;
    }
}


exports = ClassProcess;