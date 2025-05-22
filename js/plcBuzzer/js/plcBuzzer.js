const ClassActuator = require('plcActuator.min.js');
const proportion = (x, in_min, in_max, out_min, out_max) => {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

/**
 * @typedef TypeBuzzerStart
 * @property {Number} value    - уровень частоты
 * @property {Number} numRep   - количество повторений [1...n]
 * @property {Number} pulseDur - длительность звучания в ms [50<=x<infinity]
 * @property {Number} prop     - пропорция ЗВУК/ТИШИНА на одном периоде [0<x<=1]
*/  
/**
 * @class
 * Класс ClassBuzzer реализует логику работы пьезодатчика.
 */
class ClassBuzzer extends ClassActuator {
    constructor(_opts) {
        this.name = 'Buzzer';                               
        ClassActuator.call(this, _opts);   //вызов родительского конструктора
        this._MinFreq = 0;
        this._MaxFreq = _opts.maxFreq || 4000;

        if (typeof this._MaxFreq !== 'number' || 
            typeof this._MinFreq !== 'number') throw new Error('Invalid range values'); 
        pinMode(this._Pins[0], 'output', true);
        this.InitTasks();
    }

    /**
    * @method
    * Инициализирует стандартные таски модуля
    */
    InitTasks() {
        this._Channels[0].AddTask('PlaySound', (opts) => {
            //проверка и валидация аргументов 
            ['value', 'numRep', 'pulseDur', 'prop'].forEach(property => {
                if (typeof opts[property] !== 'number' || opts[property] < 0) throw new Error('Invalid args');
            });
            opts.prop = E.clip(opts.prop, 0, 1); 
            opts.pulseDur = E.clip(opts.pulseDur, 0, 2147483647);  //ограничение длины импульса максимальным знчением, которое может быть передано в setTimeout

            /*-сформировать двойной звуковой сигнал */
            const value = opts.value;
            let Thi = opts.pulseDur; //длительность звукового сигнала
            let Tlo = Math.floor(opts.pulseDur*(1 - opts.prop)/opts.prop); //длительность паузы
            count = opts.numRep*2;                                     //количество полупериодов(!) звукового сигнала
            let beep_flag = true;

            let beep_func = () => {
                --count;
                if (count > 0) {
                    if (beep_flag) {
                        this.SetValue(0);                                           //выключить звук
                        this._Interval = setTimeout(beep_func, Tlo);          //взвести setTimeout
                    } else {
                        this.SetValue(value);                                     //включить звук
                        this._Interval = setTimeout(beep_func, Thi);          //взвести setTimeout
                    }
                    beep_flag = !beep_flag;
                } else {
                    this.ResolveTask(0);               //завершение таска
                };
            };

            this.SetValue(value) //включить звуковой сигнал
            this._Interval = setTimeout(beep_func, Thi);
        });

        this._Channels[0].AddTask('BeepOnce', function(_value, _dur) {
            if (!Number.isInteger(_dur) || _dur < 0) throw new Error('Invalid args');

            this.SetValue(_value);
            setTimeout(() => {
                this.SetValue(0);
                this.ResolveTask(0);
            }, _dur);
        });    

        this._Channels[0].AddTask('BeepTwice', (_val, _dur) => {

            if (!Number.isInteger(_dur) || _dur < 0) throw new Error('Invalid args');
        
            this.SetValue(_val);          //вкл звук 

            setTimeout(() => {
                this.SetValue(0);
            }, _dur);                //выкл звук через один полупериод

            setTimeout(() => {
                this.SetValue(_val);
            }, _dur*2);              //вкл звук через два полупериода

            setTimeout(() => {
                this.SetValue(0);         //выкл через 3 полупериода
                setTimeout(() => { this.ResolveTask(0); }, _dur*4);  //деактивировать таск через 2 полных периода
            }, _dur*3);
        });
    }
    /**
     * @method
     * @description Подает звуковой сигнал на частоте, пропорциональной полученному аргументу
     * @param {number} _chNum 
     * @param {number} _val - коэффициент от 0 до 1
     */
    SetValue(_chNum, _val) {
        if (typeof _val !== 'number') throw new Error();
        _val = E.clip(_val, 0, 1);

        let freq = proportion(_val, 0, 1, this._MinFreq, this._MaxFreq);
        
        if (_val == 0) {
            analogWrite(this._Pins[0], 0);
            this._Channels[0].Status = 0;
        } else {
            analogWrite(this._Pins[0], 0.5, { freq : freq }); //включить звуковой сигнал
            this._Channels[0].Status = 1;
        }
        
        return true;
    }
}

exports = ClassBuzzer;
