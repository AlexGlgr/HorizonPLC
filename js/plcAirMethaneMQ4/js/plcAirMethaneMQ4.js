const ClassSensor = require('plcSensor.min.js');
/**
 * @class
 * Модуль реализует базовые функции датчика MQ-4,
 * возращающего данные о концентрации природного газа в воздухе
 */
class ClassAirMethaneMQ4 extends ClassSensor {
    /**
     * @constructor
     * @param {Object} _opts   - Объект с параметрами по нотации ClassSensor
     */
    constructor(_opts) {
        ClassSensor.call(this, _opts);
        this._Name = 'ClassAirMethaneMQ4'; //переопределяем имя типа
		this._Sensor = require('BaseClassMQX.min.js').connect({dataPin: _opts.pins[0], heatPin: _opts.pins[1], model: 'MQ4', r0: _opts.baseline});
        this._MinPeriod = 250;
        this._Interval;
        this._CanRead = true;
    }
    /**
     * @method
     * Инициализирует датчик
     */
    Init() {
        this.Preheat();
    }
    /**
     * @method
     * Запускает сбор данных с датчика и передачи их в каналы
     * @param {Number} _period          - частота опроса (минимум 250 мс)
     * @param {Number} _num_channel     - номер канала
     */
    Start(_num_channel, _period) {
        let period = (typeof _period === 'number' & _period >= this._MinPeriod) ? _period    //частота сверяется с минимальной
                 : this._MinPeriod;
        this._Channels[_num_channel].Status = 1;
        if (!this._Interval) {          //если в данный момент не ведется ни одного опроса
            this._Interval = setInterval(() => {
                if (this._Channels[0].Status) this._Channels[0].Value = this._CanRead ? this._Sensor.read('CH4') : 0;
            }, period);
        }
    }
    /**
     * @method
     * Управление нагревателем датчика
     * @param {Number} _val   - Значение от 0 до 1, где 1 - нагрев на максимально возможную температуру,
     * а 0 - выключение нагревателя.
     */
    ControlHeater(_val)
    {
        this._Sensor.heat(_val);
    }
    /**
     * @method
     * Запускает датчик на полный прогрев в течении 30 секнуд. 
     * В этот период нельзя читать данные с датчика.
     * По окончанию нагрева выводтися сообщение.
     * Нагреватель остаётся включенным.
     */
    Preheat()
    {
        this._CanRead = false;
        console.log("Beginning to preheat MQ-4...");
        this._Sensor.preheat(() => {
            console.log("MQ-4 is heated!");
            this._CanRead = true;
        });
    }
    /**
     * @method
     * Запускает датчик на калибровку - определяет базовое значение
     * концентрации природного газа в воздухе
     * @param {Number} _val   - Значение для калибровки, необязательный параметр
     */
    Calibrate(_val)
    {
        this._Sensor.calibrate(_val);
    }
    /**
     * @method
     * Меняет частоту опроса датчика
     * @param {Number} freq     - новая частота опроса (минимум 1000 мс)
     */
    ChangeFreq(_num_channel, freq) {
        clearInterval(this._Interval);
        setTimeout(() => this.Start(freq), this._Minfrequency);
    }
    /**
     * @methhod
     * Останавливает сбор данных с датчика
     * @param {Number} _num_channel   - номер канала, в который должен быть остановлен поток данных
     */
    Stop(_num_channel) {
        if (_num_channel) this._UsedChannels.splice(this._UsedChannels.indexOf(_num_channel));
        else {
            this._UsedChannels = [];
            clearInterval(this._Interval);
            this._Interval = null;
        }
    }
}
	

exports = ClassAirMethaneMQ4;