const ClassSensor = require('plcSensor.min.js');
/**
 * @class
 * Класс реализует контроль над состоянием потенциометра
 */
class ClassPotentiometer extends ClassSensor {
    constructor(_opts) {
        //ClassSensor.call(this, _opts);
        super(_opts);
        if (this._Pins.length < 1) throw new Error();
        pinMode(this._Pins[0], 'analog', true);
    }
    /**
     * @method
     * @description Запускает циклическое обновление значения канала
     * @param {number} _chNum 
     * @param {number} _period 
     * @returns 
     */
    Start(_chNum, _period) {
        this._Channels[0].Status = 1;
        let period = _period ? E.clip(_period, 20, Infinity) : 50;

        this._Interval = setInterval(() => {
            let val = analogRead(this._Pins[0]);
            this._Channels[0].Value = val;
        }, period);
        return true;
    }
    /**
     * @method
     * @description Прекращает опрос
     */
    Stop() {
        this._Channels[0].Status = 0;
        if (this._Interval) {
            clearInterval(this._Interval);
            return true;
        }
        return false;
    }
    /**
     * @method
     * @description Задает скалирование значений к указанному диапазону.
     * @param {number} _chNum 
     * @param {object} _opts 
     * @returns 
     */
    Configure(_chNum, _opts) {
        let opts = _opts || {};
        if (typeof opts.range === 'number' &&
            opts.range > 0 &&
            Number.isInteger(opts.range)) {
               this._Range = opts.range;
               return true; 
            }
        return false;
    }
}

exports = ClassPotentiometer;