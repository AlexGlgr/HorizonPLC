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
        if (!process.env.MODULES.includes('Storage'))
            throw `Process | CRITICAL | Cannot find Storage`;

    /** Board name and identifications */
        this._FileReader = require('Storage');
        if (!(this._FileReader.list().includes('init.json')))
            throw `Process | CRITICAL | Cannot find init.json`;

        if (!(this._FileReader.list().includes('system.json')))
            throw `Process | CRITICAL | Cannot find system.json`;

        if (!(this._FileReader.list().includes('device.json')))
            throw `Process | CRITICAL | Cannot find device.json`;

        if (!(this._FileReader.list().includes('services.json')))
            throw `Process | CRITICAL | Cannot find services.json`;
        
        this._LoadFile = this._FileReader.readJSON('init.json', true).application;
        this._DeviceConfig = this._FileReader.readJSON('init.json', true).deviceConf;
        if (!this.IsProgramInConfig(this._DeviceConfig) || typeof this._DeviceConfig === 'undefined') {
            throw `Process | CRITICAL | Cannot find ${this._DeviceConfig} configuration.`;
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
            let H = this._FileReader.readJSON('services.json', true);
            let startUpFlag = 0;
            Object.defineProperty(global, 'Process', ({
                get: () => this
            }));
            Object.defineProperty(global, 'H', ({
                get: () => H
            }));
            this.PrintLogo();
            this._BoardName = `${this._FileReader.readJSON('init.json', true).name || ''}`;

            this._FileReader.open('syslog.txt', 'a').write('Starting up framework\n');

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

            if (startUpFlag != 1) {
                this.SystemMessage('ERROR', 'Not all primary services started or no primary services at all. Aborting. . .');
                load('SysDeadEnd');
                return;
            }

            this._HaveConsole = true;
            //if (H.RouteREPL.Service.isREPLConnected(this._HaveConsole));

            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `Board ID: ${this._BoardName} (${process.env.BOARD} ${process.env.SERIAL})`});
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `LoadFile set to: ${this._LoadFile}`});
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `Currently free flash memory: ${this._FileReader.getFree()} bytes.`});
            if (this._FileReader.getFree() < 100) {
                H.Logger.Service.Log({service: this._Name, level: 'W', msg: 'Low free flash memory. Try clearing log files.'});
            }

            delete this._LoadFile;

            if (!(this._FileReader.list().includes('plcSensor.min.js'))) {
                H.Logger.Service.Log({service: this._Name, level: 'N', msg: 'File \'plcSensor.min.js\' is absent. You won\'t be able to create any sensors!'});
            }
            if (!(this._FileReader.list().includes('plcActuator.min.js'))) {
                H.Logger.Service.Log({service: this._Name, level: 'N', msg: 'File \'plcActuator.min.js\' is absent. You won\'t be able to create any actuators!'});
            }

            this.InitializeModuleDrives();
            this.InitSysEvents();            

            /** Internet connection and system time*/
            try {
                if (!(this._FileReader.list().includes('network.json')))
                    throw 'Cannot find \'network.json\'. Skipping network setup';
                if (!(this._FileReader.list().includes('netsetup.json')))
                    throw 'Cannot find \'netsetup.json\'. Skipping network setup';

                let ethconf = this._FileReader.readJSON('network.json', true).eth;
                let wificonf = this._FileReader.readJSON('network.json', true).wifi;
                let setconf = this._FileReader.readJSON('netsetup.json', true)
                let netconf;
                let bus;
                let flag;

                if (ethconf.useEth == 1) {
                    if (!process.env.MODULES.includes('WIZnet')) {
                        throw `Missing WIZnet`;
                    }
                    netconf = ethconf;
                    H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Starting up Network. . .'});
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
                            throw `Failed to set up SPI bus. ${pin} is not a valid pin!`;
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
                    H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Starting up Network. . .'});
                    if (!process.env.MODULES.includes('Wifi')) {
                        let wfbus = netconf.bus;
                        bus = H.UARTbus.Service._UARTbus[wfbus.index].IDbus;
                        bus.setup(wfbus.baudrate);
                    }
                }
                else {
                    throw `Network connection not specified. Skipping.`;
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
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Boot up sequence complete!'});
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
        H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Subscribed to system events.'});
    }
    /**
     * @method
     * Инициализирует модули, описанные в выбранной конфигурации
     */
    InitializeModuleDrives() {
        let conf = Object.assign(this._FileReader.readJSON('device.json', true)[this._DeviceConfig], this._FileReader.readJSON('system.json', true));
        let driverArr = new Array();

        Object.keys(conf).forEach(driver => {
            if (driver != 'bus')
            {
                try {
                    let instance = H.DeviceManager.Service.CreateDevice(driver);
                    console.log(instance);
                    if (instance != undefined) {
                        instance.forEach(channel => {
                            if (driverArr.includes(channel.Name)) {
                                H.Logger.Service.Log({service: this._Name, level: 'W', msg: `${channel.Name} channel already exist!`});
                            }
                            else {
                                Object.defineProperty(global, channel.Name, ({
                                    get: () => channel
                                }));
                                driverArr.push(channel.Name);
                            }
                        })
                    }
                }
                catch (e) {
                    H.Logger.Service.Log({service: this._Name, level: 'E', msg: `Error loading driver ${driver} | ${e.message}`});
                }
            }
        })
        if (driverArr.length > 0) {
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `Channels loaded: ${driverArr.join()}`});
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
            return '.bootcde';
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
            return require('Storage').readJSON('system.json', true)[id];
        }
        else
            return (((require('Storage').readJSON('device.json', true) || {})[this._DeviceConfig]) || {})[id];
    }
    /**
     * @method
     * Возвращает объект с настройками для всех шин в проекте.
     * @returns {Object}
     */
    GetBusesConfig(){
        return require('Storage').readJSON('device.json', true)[this._DeviceConfig]['bus'];
    }
    /**
     * @method 
     * Выполняет чтение json-конфига, хранящего подписки на службы и соответствующие этим подпискам MQTT-топики.
     * @returns {Object}
     */
    GetMQTTClientConfig() {
        return require('Storage').readJSON('MQTTClientConfig.json', true)[this._DeviceConfig];
    }
    /**
     * @method
     * Устанавливает время системы и/через датчик RTC
     */
    SetSystemTime() {
        try {
            let conf = require('Storage').readJSON('system.json', true);

            if (!(Object.keys(conf).includes('SysClock'))) {
                throw {message: 'RTC clock is not specified in system.json!'};
            }

            this._RTC = H.DeviceManager.Service.CreateDevice('SysClock', conf['SysClock'])[0];
            let ts = this._RTC._Sensor.GetTimeUnix();
            let sys_t = Math.floor(new Date().getTime() / 1000);

            if (ts <= 1262289600 || ts >= 4099680000) {
                this._RTC._Sensor.SetTime(new Date());
                ts = this._RTC._Sensor.GetTimeUnix();
                if (ts <= 1262289600 || ts >= 4099680000) {
                   throw {message: 'RTC clock not found!'};
                }
                H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'Date of RTC clock module adjusted'});
            }
            if (sys_t <= 1262289600 || sys_t >= 4099680000) {
                setTime(ts);
                H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'System time is set via RTC clock module'});
            }
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: 'RTC check complete. Clock syncronized'});
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
        if (final_t_check <= 1262289600 || final_t_check >= 4099680000) {
            H.Logger.Service.Log({service: this._Name, level: 'W', msg: 'Failed to properly set system time!'});
        }
        else {
            H.Logger.Service.Log({service: this._Name, level: 'I', msg: `System time set to ${this.GetSystemTime()}`});
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
        return Boolean(this._FileReader.readJSON('device.json', true)[filename]);
    }
    /**
     * @method
     * Возвращает строку для логгера в случае усепеха
     * @param {String} moduleName - имя модуля
     * @returns {String} res
     */
    GetSuccessString(moduleName) {
        return `${moduleName.substring(0, moduleName.indexOf("."))} loaded.`;
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
            return `${moduleName}: Undefined in config file!`;
        } else {
            return `${moduleName.substring(0, moduleName.indexOf("."))} failed to load. Reason: ${reason.message}`;
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
            console.log(`[${this.GetSystemTime()}] Process | ${_lvl} | ${_msg}`);
        }
    }
    UpdateNetstart(nc) {
        this._FileReader.writeJSON('netsetup.json', nc);
    }
    GetRandomStartupInterval() {
        return Math.floor(Math.random() * 5000) + 200;
    }
}


exports = ClassProcess;