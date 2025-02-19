const ClassSensor = require('plcSensor.min.js');
/**
 * @class
 * Модуль реализует базовые функции метеодатчика на базе чипа LPS25HB,
 * возращающего данные о температуре и атмосферном давлении
 */
class ClassLPS25HB extends ClassSensor {
    /**
     * @constructor
     * @param {Object} _opts   - Объект с параметрами по нотации ClassSensor
     */
    constructor(_opts) {
        ClassSensor.call(this, _opts);
        this._Name = 'BaseClassLPS25HB'; //переопределяем имя типа
		this._Sensor = require('BaseClassLPS25HB.min.js').connect({i2c: _opts.bus, address: _opts.address});
        this._MinPeriod = 125;
        this._Interval;
        this._CalPressure;
        this.Init();
    }
    /**
     * @method
     * Инициализирует датчик
     */
    Init() {
        this._Sensor.init();
        this.SetDefaultPressure (this._Sensor.pressure());
    }
    /**
     * @method
     * Запускает сбор данных с датчика и передачи их в каналы
     * @param {Number} _period          - частота опроса (минимум 1000 мс)
     * @param {Number} _num_channel     - номер канала
     */
    Start(_num_channel, _period) {
        let period = (typeof _period === 'number' & _period >= this._MinPeriod) ? _period    //частота сверяется с минимальной
                 : this._MinPeriod; 
        this._Channels[_num_channel].Status = 1;
        if (!this._Interval) {          //если в данный момент не ведется ни одного опроса
            this._Interval = setInterval(() => {
                if (this._Channels[0].Status) this._Channels[0].Value = this._Sensor.temp();
                if (this._Channels[1].Status) this._Channels[1].Value = this._Sensor.pressure();
                //if (this._Channels[2].Status) this._Channels[2].Value = (this._CalPressure - (this._Channels[1].Value * 7.501)) * 10.5;
            }, period);
        }
    }

    SetDefaultPressure(pressure)
    {
        this._CalPressure = pressure * 7.501;
    }
    /**
     * @method
     * Меняет частоту опроса датчика
     * @param {Number} freq     - новая частота опроса (минимум 1000 мс)
     */
    ChangeFreq(_num_channel, freq) {
        clearInterval(this._Interval);
        setTimeout(() => this.Start(_num_channel, freq), this._MinPeriod);
    }
    /**
     * @methhod
     * Останавливает сбор данных с датчика
     * @param {Number} _num_channel   - номер канала, в который должен быть остановлен поток данных
     */
    Stop(_num_channel) {
        this._Channels[_num_channel].Status = 0;
        if (!this._Channels.find(ch => ch.Status)) {
            clearInterval(this._Interval);
            this._Interval = null;
        }
    }
}
	

exports = ClassLPS25HB;