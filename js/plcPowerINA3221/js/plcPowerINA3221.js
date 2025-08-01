const ClassSensor = require('plcSensor.min.js');
/**
 * @class
 * Низкоуровневый класс для работы с регистрами датчика INA3221 
 */
class LowLevelClassINA3221 {
    /**
    * @constructor
    */
    constructor (bus, address) {
        this._I2c = bus;
        this._Address = address || 0x40;
    }
    /**
     * @method
     * Чтение слова с датчика
     * @param {Number}  _reg  - Адрес регистра 
     * @returns {Number} res  - двубайтное число без знака
     */
    ReadWord(_reg) {
        this._I2c.writeTo(this._Address, _reg | 0x80);
        const data = this._I2c.readFrom(this._Address, 2);
        return data[0] << 8 | data[1];
    }
    /**
     * @method
     * Запись слова на датчик
     * @param {Number} _reg   - Адрес регистра
     * @param {Number} _data  - Передаваемое байтовое слово
     */
    WriteWord(_reg, _data) {
        this._I2c.writeTo(this._Address, [_reg, _data >> 8, _data]);
    }
    /**
     * @method
     * Проверка датчика
     * @param {Number} _wai     - значение WAI
     * @returns {Boolean} res   - true, если датчик не найден 
     */
    WhoIam(_wai) {
        return (this.ReadWord(0xFE) !== (_wai || 0x5449));
    }
    /**
     * @method
     * Перезагружает датчик
     */
    Reset() {
        this.WriteWord(0x00, 0x8000);
    }
     /**
     * @method
     * Перевод слова из беззнакового числа в знаковое
     * @param {Number}  _val  - число, которое нужно преобразовать
     * @returns {Number} res  - двубайтное число со знаком
     */
    UnsignedToSigned(_val) {
        return ((_val & 32768) ? _val - 65536 : _val);
    }
    /**
     * @method
     * Возвращение непреобразованного напряжения на шунте с указанного канала
     * @param {Number} _chn    - номер канала
     * @returns {Number} res   - значение напряжения
     */
    ReadShuntVoltageRaw(_chn) {
        return this.UnsignedToSigned(this.ReadWord(0x01 + ((_chn - 1) << 1)));
    }
    /**
     * @method
     * Возвращает непреобразованного нагрузочное напряжение с указанного канала
     * @param {Number} _chn    - номер канала
     * @returns {Float} res    - значение напряжения
     */
    ReadBusVoltageRaw(_chn) {
        return this.UnsignedToSigned(this.ReadWord(0x02 + ((_chn - 1) << 1)));
    }
    /**
     * @method
     * Включает указанный канал
     * @param {Array} _chn     - номер канала
     */
    EnableChannel(_chn) {
        let cfg = ReadWord(0x00);
        const chn = {
            1: 0x4000,
            2: 0x2000,
            3: 0x1000
        }
        cfg |= chn[_chn];
        this.WriteWord(0x00, cfg);
    }
    /**
     * @method
     * Выключает указанный канал
     * @param {Array} _chn     - номер канала
     */
    DisableChannel(_chn) {
        let cfg = ReadWord(0x00);
        const chn = {
            1: 0xBFFF,
            2: 0xDFFF,
            3: 0xEFFF
        }
        cfg &= chn[_chn];
        this.WriteWord(0x00, cfg);
    }
    /**
     * @method
     * Устанавливает усреднение по количеству сэмплов
     * @param {Number} _val    - код для маски регистра 
     */
    ConfigureAveraging(_val) {
        let cfg = this.ReadWord(0x00);
        cfg &= 0xF1FF;
        const avg = {
            1: 0x00,
            4: 0x200,
            16: 0x400,
            64: 0x600,
            128: 0x800,
            256: 0xA00,
            512: 0xC00,
            1024: 0xE00
        }
        cfg |= avg[_val];
        this.WriteWord(0x00, cfg);
    }
    /**
     * @method
     * Устанавливает время преобразования показаний напряжения на шине
     * @param {Number} _val    - код для маски регистра 
     */
    ConfigureBusConvertion(_val) {
        let cfg = this.ReadWord(0x00);
        cfg &= 0xFE3F;
        const bct = {
            140: 0x00,
            204: 0x40,
            332: 0x80,
            588: 0xC0,
            1100: 0x100,
            2116: 0x140,
            4156: 0x180,
            8244: 0x1C0
        }
        cfg |= bct[_val];
        this.WriteWord(0x00, cfg);
    }
    /**
     * @method
     * Устанавливает время преобразования показаний напряжения на шунте
     * @param {Number} _val    - код для маски регистра 
     */
    ConfigureShuntConvertion(_val) {
        let cfg = this.ReadWord(0x00);
        cfg &= 0xFFC7;
        const sct = {
            140: 0x00,
            204: 0x08,
            332: 0x10,
            588: 0x18,
            1100: 0x20,
            2116: 0x28,
            4156: 0x30,
            8244: 0x38
        }
        cfg |= sct[_val];
        this.WriteWord(0x00, cfg);
    }
    /**
     * @method
     * Технический метод - настраивает режим работы датчика
     * @param {Number} _val     - код для маски регистра 
     */
    ConfigureMode(_val) {
        let cfg = this.ReadWord(0x00);
        cfg &= 0xFFF8;
        cfg |= _val;
        this.WriteWord(0x00, cfg);
    }
}

/**
 * @class
 * Модуль реализует базовые функции датчика тока и напряжения на базе чипа INA3221.
 */
class ClassPowerINA3221 extends ClassSensor {
    /**
     * @constructor
     * @param {Object} _opts   - Объект с параметрами по нотации ClassSensor
     */
    constructor(_opts) {
        //ClassSensor.call(this, _opts);
        super(_opts);
        this._Name = 'ClassPowerINA3221'; //переопределяем имя типа
        this._Sensor = new LowLevelClassINA3221(_opts.bus, _opts.address);
        this._Config = _opts.config || {};
        this._MinPeriod = 20;
        this._Interval;
        this.Init();
    }
    /**
     * @method
     * Инициализация датчика, перезагрузка и проверка
     */
    Init() {
        this._Sensor.Reset();
        // if (this._Sensor.WhoIam(this._Config.WAI)) {throw new Error("INA3221 not found!");};

        let channels = this._Config.channels || [1, 2, 3];
        this._Config.rShunts = this._Config.rShunts || [0.1, 0.1, 0.1];

        this._Config.averaging = this._Config.averaging || 0;
        this._Config.busConvert = this._Config.busConvert || 1100;
        this._Config.shuntConvert = this._Config.shuntConvert || 1100;
        this._Config.mode = this._Config.mode || 7;
        this._Config.vbus = this._Config.vbus || 0;
    
        this.EnableChannels(channels);
        this.Configure(0, this._Config);
    }
    /**
     * @method
     * Метод для настройки датчика. Изменяет диапазоны измерений, режимы работы сенсора и АЦП
     * @param {Number} _num_channel     - номер канала датчика
     * @param {Object} _cfg             - объект с конфигурацией 
     * @returns null                    - если был передан не объект, то возвращается пустота
     */
    Configure(_num_channel, _cfg) {
        if (typeof _cfg !== 'object') {return;}

        // Значение усреднения в сэмплах
        if (_cfg.avr) {
            const avr = [1, 4, 16, 64, 128, 256, 512, 1024];
            if (avr.includes(_cfg.avr)) {
                this._Sensor.ConfigureAveraging(_cfg.avr);
                this._Config.averaging = _cfg.avr;
            }
        }

        // Время преобразования на шине
        if (_cfg.bcnv) {
            const us = [140, 204, 332, 588, 1100, 2116, 4156, 8244];
            if (us.includes(_cfg.bcnv)) {
                this._Sensor.ConfigureBusConvertion(_cfg.bcnv);
                this._Config.busConvert = _cfg.bcnv;
            }
        }
       
        // Время преобразования на шунте
        if (_cfg.scnv) {
            const uss = [140, 204, 332, 588, 1100, 2116, 4156, 8244];
            if (uss.includes(_cfg.scnv)) {
                this._Sensor.ConfigureShuntConvertion(_cfg.scnv);
                this._Config.shuntConvert = _cfg.scnv;
            }
        }       

        // Код режима - от 0 (выкл) до 7 (постоянное считывание)
        if (_cfg.mode != null) {
            const modes = [0, 1, 2, 3, 4, 5, 6, 7];
            if (modes.includes(_cfg.mode)) {
                this._Sensor.ConfigureMode(_cfg.mode);
                this._Config.mode = _cfg.mode;
            }
        }

        if (_cfg.vbus != null) {
            this._Config.vbus = _cfg.vbus;
        }
    }
    /**
     * @method
     * Включает каналы датчика
     * @param {Array} _arr     - массив каналов для включения 
     */
    EnableChannels(_arr) {
        const chn = [1, 2, 3];
        if (Array.isArray(_arr)) {
            _arr.forEach(e => {
                if (chn.includes(e) && !this._Config.channels.includes(e)) {
                    this._Config.channels.push(e);
                    this._Sensor.EnableChannel(e);
                }
            });
        }
    }
    /**
     * @method
     * Выключает каналы датчика
     * @param {Array} _arr     - массив каналов для выключения 
     */
    DisableChannels(_arr) {
        const chn = [1, 2, 3];
        if (Array.isArray(_arr)) {
            _arr.forEach(e => {
                if (chn.includes(e) && this._Config.channels.includes(e)) {
                    const index = this._Config.channels.indexOf(e);
                    this._Config.channels.splice(index, 1);
                    this._Sensor.DisableChannel(e);
                }
            });
        }
    }
    /**
     * @method
     * Возвращает значение напряжения на шунте указанного канала в миливольтах
     * @param {Number} _chn    - номер канала считывания  
     * @returns {Float} res    - результат в миливольтах
     */
    GetShuntVoltage(_chn) {
        let res = 0;
        if (this._Config.channels.includes(_chn)) {
            res = this._Sensor.ReadShuntVoltageRaw(_chn) * 0.005;
        }
        return res;
    }
    /**
     * @method
     * Возвращает значение напряжения на шине указанного канала в миливольтах
     * @param {Number} _chn    - номер канала считывания  
     * @returns {Float} res    - результат в миливольтах
     */
    GetBusVoltage(_chn) {
        let res = 0;
        if (this._Config.channels.includes(_chn)) {
            res = this._Sensor.ReadBusVoltageRaw(_chn) * 0.001;
        }
        return res;
    }
    /**
     * @method
     * Запускает сбор данных с датчика и передачи их в каналы
     * @param {Number} _period          - частота опроса (минимум 20 мс)
     * @param {Number} _num_channel     - номер канала
     */
    Start(_num_channel, _period) {
        this._Channels[_num_channel].Status = 1;
        if (!this._Interval) {          //если в данный момент не ведется ни одного опроса
            let period = (typeof _period === 'number' & _period >= this._MinPeriod) ? _period : this._MinPeriod;
            this._Interval = setInterval(() => {
                try {
                    for (let i = 0; i < 3; i++) {
                        if (this._Config.channels.includes(i+1)) {
                            if (this._Channels[0 + i * 4] != undefined && this._Channels[0 + i * 4].Status) this._Channels[0 + i * 4].Value = this._Sensor.ReadShuntVoltageRaw(i + 1) * 0.005
                            if (this._Channels[1 + i * 4] != undefined && this._Channels[1 + i * 4].Status) this._Channels[1 + i * 4].Value = this._Sensor.ReadBusVoltageRaw(i + 1) * 0.001;
                            if (this._Channels[2 + i * 4] != undefined && this._Channels[2 + i * 4].Status) this._Channels[2 + i * 4].Value = this._Channels[0 + i * 4].Value/this._Config.rShunts[i]/1000;
                            if (this._Channels[3 + i * 4] != undefined && this._Channels[3 + i * 4].Status) this._Channels[3 + i * 4].Value = this._Channels[2 + i * 4].Value * (this._Config.vbus != 0 ? this._Config.vbus : this._Channels[1 + i * 4].Value);
                        }
                    }
                }
                catch (e) {
                    H.Logger.Service.Log({service: 'INA3221', level: 'E', msg: e});
                }
            }, period);
        }
    }
    /**
     * @method
     * Меняет частоту опроса датчика
     * @param {Number} freq     - новая частота опроса (минимум 20 мс)
     */
    ChangeFreq(_num_channel, freq) {
        clearInterval(this._Interval);
        setTimeout(() => this.Start(freq), this._MinPeriod);
    }
    /**
     * @methhod
     * Останавливает сбор данных с датчика
     * @param {Number} _num_channel   - номер канала, в который должен быть остановлен поток данных
     */
    Stop(_num_channel) {
        let rest = 0;
        this._ChStatus[_num_channel] = 0;
        this._ChStatus.forEach(st => {
            if (st == 0) rest++;
        });
        if (rest == 0) {
            clearInterval(this._Interval);
            this._Interval = null;
        }
    }
}
	

exports = ClassPowerINA3221;