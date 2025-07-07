const ClassSensor = require('plcSensor.min.js');
/**
 * @class
 * Низкоуровневый класс для работы с регистрами датчика INA219
 */
class LowLevelClassINA {
    /**
     * @constructor
     */
    constructor (_bus, _address) {
        this._I2c = _bus;
        this._Address = _address || 0x40;
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
        return (this.ReadWord(0x00) !== (_wai || 0x399F));
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
     * Настройка калибровочного регистра - стр.17 документации
     * @param {Number} _val     - калибровочное значение
     */
    Calibrate(_val) {
        this.WriteWord(0x05, _val);
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
     * Возвращение непреобразованного напряжения на шунте
     * @returns {Number} res   - значение напряжения
     */
    ReadShuntVoltageRaw() {
        return this.UnsignedToSigned(this.ReadWord(0x01));
    }
    /**
     * @method
     * Возвращает непреобразованного нагрузочное напряжение
     * @returns {Float} res   - значение напряжения
     */
    ReadBusVoltageRaw() {
        return this.ReadWord(0x02) >> 3;
    }
    /**
     * @method
     * Возвращает непреобразованного значение силы тока
     * @returns {Float} res   - значение силы тока
     */
    ReadPowerRaw() {
        return this.ReadWord(0x03);
    }
    /**
     * @method
     * Возвращает непреобразованного значение мощности
     * @returns {Float} res   - значение мощности
     */
    ReadCurrentRaw() {
        return this.UnsignedToSigned(this.ReadWord(0x04));
    }    
    /**
     * @method
     * Технический метод - настраивает диапазон напряжения шины
     * @param {Number} _val     - код для маски регистра
     */
    ConfigureBVR(_val) {
        let cfg = this.ReadWord(0x00);
        cfg &= 0xDFFF;
        (_val == 32 ? cfg |= (0x2000) : 0);
        this.WriteWord(0x00, cfg);
    }
    /**
     * @method
     * Технический метод - настраивает диапазон напряжения шунта
     * @param {Number} _val     - код для маски регистра
     */
    ConfigureGain(_val) {
        let cfg = this.ReadWord(0x00);
        const pga = {
            40: 0,
            80: 0x800,
            160: 0x1000,
            320: 0x1800
        };
        cfg &= 0xE7FF;
        cfg |= pga[_val];
        this.WriteWord(0x00, cfg);
    }
    /**
     * @method
     * Технический метод - настраивает режим работы АЦП шины
     * @param {Number} _val     - код для маски регистра 
     */
    ConfigureBusADC(_val) {
        let cfg = this.ReadWord(0x00);
        const adc = {
            9: 0, 10: 0x80, 11: 0x100, 12: 0x180,
            2: 0x480, 4: 0x500, 8: 0x580, 16: 0x600,
            32: 0x680, 64: 0x700, 128: 0x780
        };
        cfg &= 0xF87F;
        cfg |= adc[_val];
        this.WriteWord(0x00, cfg);
    }
    /**
     * @method
     * Технический метод - настраивает режим работы АЦП шунта
     * @param {Number} _val     - код для маски регистра 
     */
    ConfigureShuntADC(_val) {
        let cfg = this.ReadWord(0x00);
        const adc = {
            9: 0, 10: 0x80, 11: 0x100, 12: 0x180,
            2: 0x480, 4: 0x500, 8: 0x580, 16: 0x600,
            32: 0x680, 64: 0x700, 128: 0x780
        };
        cfg &= 0xFF87;
        cfg |= adc[_val] >> 4;
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
 * Модуль реализует базовые функции датчика тока и напряжения на базе чипа INA219 по нотации фреймворка.
 */
class ClassPowerINA219 extends ClassSensor {
    /**
     * @constructor
     * @param {Object} _opts   - Объект с параметрами, содержащий шину bus (обязательное поле), 
     * адрес датчика address и его конфигурацию config (опциональные поля)
     */
    constructor(_opts) {
        ClassSensor.call(this, _opts);
        this._Name = 'ClassPowerINA219'; //переопределяем имя типа
        this._Sensor = new LowLevelClassINA(_opts.bus, _opts.address);
        this._Config = _opts.config || {};
        this._MinPeriod = 20;
        this._Interval;
        this.Init();
    }
    /**
     * @method
     * Инициализация датчика, перезагрузка, проверка и калибровка
     */
    Init() {
        this._Sensor.Reset();
        if (this._Sensor.WhoIam(this._Config.WAI)) {throw new Error("INA219 not found!");};

        this._Config.maxCurrent = this._Config.maxCurrent || 3.2768;
        this._Config.rShunt = this._Config.rShunt || 0.1;

        this._Config.busVoltageRange = this._Config.busVoltageRange || 32;
        this._Config.gain = this._Config.gain || 320;
        this._Config.busADC = this._Config.busADC || 12;
        this._Config.shuntADC = this._Config.shuntADC || 12;
        this._Config.mode = this._Config.mode || 7;

        this.Calibrate(0, {amps: this._Config.maxCurrent, ohms: this._Config.rShunt});
        this.Configure(0, this._Config);
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
                if (this._Channels[0].Status) this._Channels[0].Value = this._Sensor.ReadShuntVoltageRaw() * 0.00001;
                if (this._Channels[1].Status) this._Channels[1].Value = this._Sensor.ReadBusVoltageRaw() * 0.004;
                if (this._Channels[2].Status) this._Channels[2].Value = this._Sensor.ReadCurrentRaw() * this._Config.currentLSB;
                if (this._Channels[3].Status) this._Channels[3].Value = this._Sensor.ReadPowerRaw() * this._Config.currentLSB * 20;
            }, period);
        }
    }
    /**
     * @method
     * Метод для калибровки датчика. Изменяет максимальное значение напряжения и сопротивление на шунте
     * @param {Number} _num_channel     - номер канала датчика
     * @param {Object} _clb             - объект с конфигурацией для калибровки
     * @returns null                    - если был передан не объект, то возвращается пустота
     */
    Calibrate(_num_channel, _clb) {
        if (typeof _clb !== 'object') {return;}

        // Значение максимальной силы тока в амперах
        if (_clb.amps && typeof _clb.amps === 'number') {
            this._Config.maxCurrent = _clb.amps || 3.2768;
            this._Config.currentLSB = (this._Config.maxCurrent * 3.0517578125 / 100000.0);
            this._Sensor.Calibrate((Math.round(0.04096 / (this._Config.currentLSB * this._Config.rShunt))));
        }

        // Значение сопротивления в омах
        if (_clb.ohms && typeof _clb.ohms === 'number') {
            this._Config.rShunt = _clb.ohms || 0.1;
            this._Sensor.Calibrate((Math.round(0.04096 / (this._Config.currentLSB * this._Config.rShunt))));
        }
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

        // Значение диапазона в вольтах - 16 или 32
        if (_cfg.bvr) {
            const bvr_values = [16, 32];
            if (bvr_values.includes(_cfg.bvr)) {
                this._Sensor.ConfigureBVR(_cfg.bvr);
                this._Config.busVoltageRange = _cfg.bvr;
            }
        }

        // Значение диапазона в миливольтах - 40, 80, 160 или 320
        if (_cfg.gain) {
            const gain_values = [40, 80, 160, 320];
            if (gain_values.includes(_cfg.gain)) {
                this._Sensor.ConfigureGain(_cfg.gain);
                this._Config.gain = _cfg.gain;
            }
        }

        // Режим работы АЦП шины: разрядность или количество сэмплов
        if (_cfg.badc) {
            const adc_values = [9, 10, 11, 12, 2, 4, 8, 16, 32, 64, 128];
            if (adc_values.includes(_cfg.badc)) {
                this._Sensor.ConfigureBusADC(_cfg.badc);
                this._Config.busADC = _cfg.badc;
            }
        }

        // Режим работы АЦП шунта: разрядность или количество сэмплов
        if (_cfg.sadc) {
            const adc_values = [9, 10, 11, 12, 2, 4, 8, 16, 32, 64, 128];
            if (adc_values.includes(_cfg.sadc)) {
                this._Sensor.ConfigureShuntADC(_cfg.sadc);
                this._Config.shuntADC = _cfg.sadc;
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
        this._ChStatus[_num_channel] = 0;
        if (this._ChStatus[0] == 0 && this._ChStatus[1] == 0 && this._ChStatus[2] == 0 && this._ChStatus[3] == 0) {
            clearInterval(this._Interval);
            this._Interval = null;
        }
    }
}	

exports = ClassPowerINA219;