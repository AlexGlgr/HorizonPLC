/**
 * @class
 * Класс для работы с пульсовыми датчиками, осуществляющий подсчет импульсов на пине.
 * Предоставляет методы для запуска и остановки подсчета импульсов, а также получения информации о значениях счетчиков.
 */
class ClassPulseCounter extends ClassSensor {
    constructor(opts) {
        //ClassSensor.call(this, opts);
        super(opts);
        this._SetWatch;
        this._Interval = Array(2);
    }
    /**
     * @typedef {Object} InterruptOptions
     * @property {string} [edge='rising'] - на каком фронте будет срабатывать прерывание: 'rising' (передний), 'falling' (задний) или 'both' (оба).
     * @property {number} [debounce=0] - программный «антидребезг», заданный в миллисекундах.
     */
    /**
     * 
     * @param {Number} _chNum - номер канала (пина)
     * @param {InterruptOptions} _opts - параметры мониторинга прерываний
     * @returns 
     */
    Start(_chNum, _opts) {
        _opts = { repeat: true };

        this._Channels[0].Value = 0;
        this._SetWatch = setWatch(() => {
            this._Channels[0].Value = this._Channels[_chNum].Value + 1;
        }, 
        this._Pins[0], _opts);
        
        let count_one_sec_ago = 0;
        let count_one_min_ago = 0;

        this._Interval[0] = setInterval(() => {
            if (this._Channels[0].Status) {
                this._Channels[1].Value = this._Channels[0].Value - count_one_sec_ago; // импульсов за последний период
                count_one_sec_ago = this._Channels[0].Value;
            }
        }, 1000);

        this._Interval[1] = setInterval(() => {
            if (this._Channels[0].Status) {
                this._Channels[2].Value = this._Channels[0].Value - count_one_min_ago; // импульсов за последний период
                count_one_min_ago = this._Channels[0].Value;
            }
        }, 60000);

        this._Channels[0].Status = 1;
        this._Channels[1].Status = 1;
        this._Channels[2].Status = 1;

        return this;
    }

    Stop(_chNum) {
        if (!this._SetWatch) return false;

        clearWatch(this._SetWatch);
        this._SetWatch = null;

        clearInterval(this._Interval[0]);
        clearInterval(this._Interval[1]);
        this._Interval[0] = null;
        this._Interval[1] = null;

        this._Channels[0].Status = 0;
        this._Channels[1].Status = 0;
        this._Channels[2].Status = 0;
        return this;
    }
}
exports = ClassPulseCounter;