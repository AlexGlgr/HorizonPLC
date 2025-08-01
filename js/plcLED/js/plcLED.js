const ClassActuator = require('plcActuator.min.js');
/**
 * @class
 * @description Класс Предназначен для управления одноканальными светодиодами
 */
class ClassLED extends ClassActuator {
    constructor(opts) {
        //ClassActuator.call(this, opts);
        super(opts);
        /**
         * Примечание: предусмотрена возможность управления N светодиодами (каждый канал - диод)
         * Не является рекомендуемым подходом
         */
        this._Pins.forEach(_p => _p.mode('output'));
    }
    /**
     * @typedef TypeAWOpts
     * @property {number} freq
     * @property {Boolean} soft - разрешено ли использовать программный adc при отсутствии аппаратного
     */
    /**
     * @method
     * @description Устанавливает уровень свечения светодиода
     * @param {number} _chNum - номер канала 
     * @param {number} _val 
     * @param {TypeAWOpts} _opts 
     */
    SetValue(_chNum, _val, _opts) {
        _opts = _opts || {};
        // если soft не был явно указан, то true для совместимости с портами без поддержки ADC
        if (_opts.soft == undefined) _opts.soft = true;
        // нормализация
        let val = E.clip(_val, 0, 1);

        this._Channels[_chNum].Status = (val == 0) ? 0 : 1;
        analogWrite(this._Pins[_chNum], val, _opts);
        return true;
    }
}
exports = ClassLED;