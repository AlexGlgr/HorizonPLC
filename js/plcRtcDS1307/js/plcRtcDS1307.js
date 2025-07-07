const ClassSensor = require('plcSensor.min.js');
/**
 * @class
 * Класс ClassRTC реализует логику работы часов реального времени. Микросхема DS1307.
 * Для работы класса требуется подключить модуль ModuleAppMath, где 
 * добавляется функция проверки на целочисленность, а так-же модуль rtc,
 * который обеспечивает базовые функции часов
 */
class ClassDS1307 extends ClassSensor {
    /**
     * @constructor
	 * @param {Object} _opts   			- Объект с параметрами по нотации ClassSensor
	 * @param {Object} _sensor_props    - Объект для инициализации по нотации ClassSensor
     */
    constructor(_opts, _sensor_props) {
		ClassSensor.apply(this, [_opts, _sensor_props]);
        this._Name = 'ClassClassDS1307'; //переопределяем имя типа
		this._Rtc = require('BaseClassDS1307.min.js').connect(_opts.bus);
		this._MinPeriod = 100;
		this._UsedChannels = [];
        this._Interval;
		this.Init(_sensor_props);
    }
	/*******************************************CONST********************************************/
	/**
     * @const
     * @type {number}
     * Константа ERROR_CODE_ARG_VALUE определяет код ошибки, которая может произойти
     * в случае передачи не валидных данных
     */
    static get ERROR_CODE_ARG_VALUE() { return 10; }
    /**
     * @const
     * @type {string}
     * Константа ERROR_MSG_ARG_VALUE определяет сообщение ошибки, которая может произойти
     * в случае передачи не валидных данных
     */
	static get ERROR_MSG_ARG_VALUE() { return `ERROR>> invalid data. ClassID: ${this.name}`; }
    /*******************************************END CONST****************************************/
	/**
     * @method
     * Инициализирует датчик
     */
    Init(_sensor_props) {
        super.Init(_sensor_props);
    }
    /**
     * @method
     * Настривает время на модуле. Принимает объект класса Date
	 * или строку в формате ISO.
     * @param {(Date|string)} _date   - объект класса Date или строка в формате ISO
     */
    SetTime(_date) {
        /*проверить переданные аргументы на валидность*/
		let newDate;
		print(typeof _date);
		if (typeof _date === 'string' &&
			(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str))) {
			newDate = new Date(_date);
			print(typeof newDate);
			if (!(newDate instanceof Date)) {
				throw new err(ClassDS1307.ERROR_MSG_ARG_VALUE,
					ClassDS1307.ERROR_CODE_ARG_VALUE);
				}
		}
		/*else if (_date instanceof Date) {
			newDate = _date;
		}
		else {
			throw new err(ClassDS1307.ERROR_MSG_ARG_VALUE,
				ClassDS1307.ERROR_CODE_ARG_VALUE);
		}*/
		newDate = _date;
		/*проверить, что дата поддерживается модулем*/
		let year=newDate.getFullYear();
		/*нормализовать аргументы*/
		if (year<2000) 	{year = 2000;}
		if (year>2099) 	{year = 2099;}

		newDate.getFullYear(year);

		this._Rtc.setTime(newDate);
    }
	/**
     * @method
	 * Единовременно изменяет одну из величин даты, от года до секунды, а также обеспечивает валидность
	 * вводимых данных (Если год выбран вне поддерживаемого схемой диапазона,
	 * то он будет автоматически подогнан к допустимому минимуму или максимуму)
     * @param {number} _val   - значение, на которое переводим
	 * @param {string} _key	  - что переводим (yy, dd, MM, hh, mm, ss)
     */
	AdjustTime(_val, _key) {
		/*проверить переданные аргументы на валидность*/
		if (!(Number.isInteger(_val))	||
			!(typeof _key === 'string')) {
				throw new err(ClassDS1307.ERROR_MSG_ARG_VALUE,
					ClassDS1307.ERROR_CODE_ARG_VALUE);
		}
		/*получить время с часов*/
		let temp=this._Rtc.getTime('def');
		let _year=temp.getFullYear();
		let _month=temp.getMonth() + 1;
		let _day=temp.getDate();
		let _hour=temp.getHours();
		let _minute=temp.getMinutes();
		let _second=temp.getSeconds();
		/*по ключу выбрать проверку и настроить дату*/
		switch (_key) {
			case 'yy':
			case 'year':
				if (_val<2000) 	{_val = 2000;}
				if (_val>2099) 	{_val = 2099;}
				_year = _val;
				break;
			case 'MM':
			case 'month':
				if (_val<1) 	{_val = 1;}
				if (_val>12) 	{_val = 12;}
				_month = _val;
				break;
			case 'dd':
			case 'day':
				if (_val<1) 		{_val = 1;}
				if (_val>31 && ((_month&1)^((_month>>3)&1))) {
					_val = 31;
				}
				if (_val>30 && !((_month&1)^((_month>>3)&1))) {
					_val = 30;
				}
				if (_val>28 && _month==2) {
					if (date.year%4) {_val = 28;}
					else {_val = 29;}
				}
				_day = _val;
				break;
			case 'hh':
			case 'hours':
				if (_val<0) 	{_val = 0;}
				if (_val>23) 	{_val = 23;}
				_hour = _val;
				break;
			case 'mm':
			case 'minute':
				if (_val<0) 	{_val = 0;}
				if (_val>59) 	{_val = 59;}
				_minute = _val;
				break;
			case 'ss':
			case 'second':
				if (_val<0) 	{_val = 0;}
				if (_val>59) 	{_val = 59;}
				_second = _val;
				break;
			default:
				throw new err(ClassRTC.ERROR_MSG_ARG_VALUE,
					ClassRTC.ERROR_CODE_ARG_VALUE);
		}
		
		/*записать измененное время*/
		this._Rtc.setTime(new Date(
			_year,
			_month-1,
			_day,
			_hour,
			_minute,
			_second
		));
	}
	/**
	 * @method
	 * Возвращает текущее время с модуля в формате iso
	 * @returns {string}	_res	- строка вида 2020-01-01T13:55:16
	 */
	GetTimeISO() {	
		let _res = this._Rtc.getTime('iso');
		return _res;
	}
	/**
	 * @method
	 * Возвращает текущее время с модуля в формате unix - 
	 * время в секундах от 1970 года.
	 * @returns {string}	_res	- строка вида 144712561
	 */
	GetTimeUnix() {	
		let _res = this._Rtc.getTime('unixtime');
		return _res;
	}
	/**
     * @method
	 * Возвращает текущее время с модуля в формате - час:минута:секунда 
	 * @returns {string}	_res	- строка вида 12:33:23
     */
	GetTimeHMS() {	
		let time = this._Rtc.getTime('def');
		let _res = this._Rtc._leadZero(time.getHours()) +
			':' +
			this._Rtc._leadZero(time.getMinutes()) +
			':' +
			this._Rtc._leadZero(time.getSeconds());
		
		return _res;
    }
	/**
     * @method
     * Запускает сбор данных с датчика и передачи их в каналы
     * @param {Number} _period          - частота опроса (минимум 100 мс)
     * @param {Number} _num_channel     - номер канала
     */
    Start(_num_channel, _period) {
        let period = (typeof _period === 'number' & _period >= this._MinPeriod) ? _period    //частота сверяется с минимальной
                 : this._MinPeriod;

        if (!this._UsedChannels.includes(_num_channel)) this._UsedChannels.push(_num_channel); //номер канала попадает в список опрашиваемых каналов. Если интервал уже запущен с таким же периодои, то даже нет нужды его перезапускать 
        if (!this._Interval) {          //если в данный момент не ведется ни одного опроса
            this._Interval = setInterval(() => {
                if (this._UsedChannels.includes(0)) this.Ch0_Value = this.GetTimeUnix();
				if (this._UsedChannels.includes(1)) this.Ch1_Value = this.GetTimeISO();
				if (this._UsedChannels.includes(2)) this.Ch2_Value = this.GetTimeHMS();
            }, period);
        }
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

exports = ClassDS1307;