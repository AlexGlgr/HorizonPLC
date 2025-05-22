const STATUSES = ['Closed','Ready','Wait','Accept','Wait for close','Data on close', 'UDP Create'];
const TYPES = ['Unknown','TCP-Client','TCP-Server','UDP-Client','TCP-Remote_Client']
const MAXSOCKETS = 5;

/**
 * @class
 */
class HorizonAT {
    constructor (usart) {
        this._Serial = usart;
        this._Debug = false; // флаг для дебагга
        this._Line = ''; // строка ответа, приходящая по шине на RX
        this._LineCallback; // функция, выполняющаяся при получении ответа от чипа (ответ на АТ команду)
        this._DataCount = 0; // количество байт, которые необходимо забрать из ответа (если невозможно забрать сразу всё, остаток отправляется сюда)
        this._DataCallback; // функция, выполняющаяся при получении данных (данные со стороннего клиента/сервера)
        this._Handlers = {}; // функции, выполняющиеся при получении ответа, начинающегося на указанный символ (метод Register - любая строка, начинающаяся с указанного символа)
        this._LineHandlers = {}; // функции, выполняющиеся при получении ответа - определённой строки (метод RegisterLine - полное совпадение строки, заканчивающейся терминатором)
        this._Waiting = []; // массив команд, представляющих очередь на выполнение

        this.Init();
    }
    /**
     * @method
     * Выполняется каждый раз, когда с Serial-шины приходят данные
     * @param {ByteArray} _data     - данные, приходящие с чипа
     * @returns {String} _data      - полученные данные отдаются выше в обработчик
     */
    Init() {
        this._Serial.on('data', cb = (_data) => {
            if (this._DataCount > 0) { // данные неполные, пользователь попросил то, что осталось через GetData()
                if (this._Line != '') { // полученная строка не пустая - добавить к возвращаемым данным
                    _data = this._Line + _data;
                    this._Line = '';
                }
                if (_data.length <= this._DataCount) {// получили, но не всё
                    this._DataCount -= _data.length;
                    if (this._DataCallback !== undefined) this._DataCallback(_data);
                    if (this._DataCount == 0) this._DataCallback = undefined;
                    return;
                }
                else { // все данные пришли
                    if (this._DataCallback !== undefined) this._DataCallback(_data.substring(0, this._DataCount));
                    _data = _data.substring(this._DataCount);
                    this._DataCount = 0;
                    this._DataCallback = undefined;
                }
            }

            // обрабатываем данные построчно
            this._Line += _data;
            if (this._Line[0] == '\n') this._Line = this._Line.substring(1); // удалить лишний терминатор

            // вызвать обработчик, если мы зарегистрировалиль с соответствующим началом строки (Register)
            if (this._Handlers) {
                for (let head in this._Handlers) {
                    try {
                        while (this._Line.substring(0,head.length) == head) {
                            let pre = this._Line;
                            this._Line = this._Handlers[head](this._Line);
                            if (pre == this._Line) return; // не все данные
                        }
                    }
                    catch (e) {
                        console.log(this._Line.charCodeAt(0));
                    }
                }
            }
            // ответ с чипа по шине возвращается не всегда полным, для этого нужно ловить отдельные части и склеивать, пока не найдётся настоящий конец данных. Пример:
            /**
             * WI
             * FI CONNE
             * CTED
             */
            let i = this._Line.indexOf('\r'); // найти конец строки
            while (i >= 0) {
                let subline = this._Line.substring(0,i);
                let handled = false;
                if (subline.length > 0) {
                    // вызвать обработчик, если мы зарегистрировалиль с соответствующей строкой (RegisterLine)
                    for (let head in this._LineHandlers) {
                        if (subline.substring(0,head.length) == head) {
                            this._LineHandlers[head](subline);
                            handled = true;
                        }
                        // не нашли - вызвать отдельный коллбэк
                        if (!handled && this._LineCallback !== undefined) this._LineCallback(subline);
                    }
                }
                if (this._Line === undefined)
                    console.log(this._Line);
                this._Line = this._Line.substring(i + 1);
                if (handled && this._DataCount) return cb('');
                if (this._Line[0] == '\n') this._Line = this._Line.substring(1); // удалить лишний терминатор, снова
                // проверить, не начинается-ли строка с указанных в Register символов
                if (this._Line.length && this._Handlers) {
                    if (this._Line === undefined)
                        console.log(this._Line);
                    for (let head in this._Handlers) {
                        if (this._Line.substring(0,head.length) == head) {
                            this._Line = this._Handlers[head](this._Line);
                        }
                    }
                }
                i = this._Line.indexOf('\r'); // найти конец строки и повторить цикл
            }
        });
    }
    /**
     * @method
     * Выполняет АТ команду
     * @param {String} _comm            - АТ команда, которую необходимо выполнить
     * @param {Number} _timeout         - таймаут, после которого считаеся, что ответа от чипа нет
     * @param {Function} callback       - функция, которая вернёт ответ от чипа
     * @returns 
     */
    Execute (_comm, _timeout, callback) {
        // в данный момент выполняется другая команда - положить в очередь
        if (this._LineCallback !== undefined) {
            this._Waiting.push([_comm, _timeout, callback]);
            return;
        }
        this._Serial.write(_comm); // пишем команду на Serial
        if (_timeout > 0) { // если усановлен таймаут - заряжаем его
            let cbTOut = setTimeout(() => {
                this._LineCallback = undefined;
                if (callback !== undefined) callback();
                if (this._LineCallback === undefined && this._Waiting.length > 0) 
                    this.Execute.apply(this, this._Waiting.shift());
            }, _timeout);

            let cb = (data) => {
                this._LineCallback = undefined;
                let cbBucket;
                if (callback !== undefined && (cbBucket = callback(data))) {
                    this._LineCallback = cb;
                    callback = cbBucket;
                }
                else clearTimeout(cbTOut);
                if (this._LineCallback === undefined && this._Waiting.length > 0) 
                    this.Execute.apply(this, this._Waiting.shift());
            }
            this._LineCallback = cb;
        }        
    }
    /**
     * @method
     * Выполняет АТ команду, но ожидает определённый ответ
     * @param {String} _comm                - АТ команда, которую необходимо выполнить
     * @param {Number} _timeout             - таймаут, после которого считаеся, что ответа от чипа нет
     * @param {String} _key                 - ответ, который ожидается
     * @param {Function} keyCallback        - функция, которая выполнится после получения ожидаемого ответа
     * @param {Function} finalCallback      - функция, которая выполнится по завершению всей команды
     */
    ExecuteAwait (_comm, _timeout, _key, keyCallback, finalCallback) {
        this.RegisterLine(_key, keyCallback);
        this.Execute(_comm, _timeout, (data) => {
            this.UnregisterLine(_key);
            finalCallback(data);
        });
    }
    /**
     * @method
     * Передаёт данные на чип по шине без ожидания ответа
     * @param {String} _comm                - данные, которые будут переданы по шине
     */
    Write (_comm) {
        this._Serial.write(_comm);
    }
    /**
     * @method
     * Регистрирует функцию, которая будет автоматически выполнена, если с чипа вернётся указанная строка
     * @param {String} _key                 - строка, которая ожидается в ответе
     * @param {Function} callback           - функция, которая будет выполнена, если ожидаемая строка вернётся в качестве ответа
     */
    RegisterLine (_key, callback) {
        if (this._LineHandlers[_key] !== undefined) H.Logger.Service.Log({service: 'AT', level: 'E', msg: `"${_key}" already registered as a line!`});
        else this._LineHandlers[_key] = callback;
    }
    /**
     * @method
     * Удаляет функцию, зарегистрированную по указанной строке.
     * @param {String} _key                 - строка, при получении которой ожидалось действие
     */
    UnregisterLine (_key) {
        delete this._LineHandlers[_key];
    }
    /**
     * @method
     * Регистрирует функцию, которая будет автоматически выполнена, если с чипа вернётся строка, начинающаяся с указанных символов/символа
     * @param {String} _key                 - строка или символ, с которого начинается ожидаемый ответ
     * @param {Function} callback           - функция, которая будет выполнена, если ожидаемая строка вернётся в качестве ответа
     */
    Register (_key, callback) {
        if (this._Handlers[_key] !== undefined) H.Logger.Service.Log({service: 'AT', level: 'E', msg: `"${_key}" already registered as a char!`});
        else this._Handlers[_key] = callback;
    }
    /**
     * @method
     * Удаляет функцию, зарегистрированную по строке, начинающейся на переданную строку или символу.
     * @param {String} _key                 - строка или символ, с которой начинается ответ, при получении которого ожидалось действие
     */
    Unregister (_key) {
        delete this._Handlers[_key];
    }
    /**
     * @method
     * Возвращает состояние объекта, занят-ли он передачей/получение информации в данный момент
     * @returns {Boolean} busy              - флаг, показывающий занят-ли данный объект
     */
    IsBusy () {
        return this._LineCallback !== undefined;
    }
    /**
     * @method
     * Перенаправляет следующее указанное количество байт в указанный колбэк
     * @param {Number} _charCount           - количетсво символов/байт
     * @param {Function} callback           - функция, которой они будут обработаны
     */
    GetData (_charCount, callback) {
        if (this._DataCount > 0) H.Logger.Service.Log({service: 'AT', level: 'E', msg: `Already grabbing data!`});
        else {
            this._DataCount = _charCount;
            this._DataCallback = callback;
        }
    }
}

/**
 * @class
 * 
 */
class ESP {
    constructor(bus_serial) {
        this._At = new HorizonAT(bus_serial);
        require('NetworkJS').create({
            create : (host, port, socketType, options) => this.Create(host, port, socketType, options),
            close : (socket) => this.Close(socket),
            accept : (socket) => this.Accept(socket),
            recv : (socket, maxLen) => this.Recv(socket, maxLen),
            send : (socket, data, socketType) => this.Send(socket, data, socketType)
        });
        this._SocketArray = [
            { Status: STATUSES[0], Type: TYPES[0], Data: undefined },
            { Status: STATUSES[0], Type: TYPES[0], Data: undefined },
            { Status: STATUSES[0], Type: TYPES[0], Data: undefined },
            { Status: STATUSES[0], Type: TYPES[0], Data: undefined },
            { Status: STATUSES[0], Type: TYPES[0], Data: undefined },
            { Status: STATUSES[0], Type: TYPES[0], Data: undefined }// reserved for server
        ];
        this._UDPEndPoints = [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
        ];
    }
    /**
     * @method
     * Инициализация библиотеки
     * @param {Function} callback        - функция колбека 
     */
    Init(callback) {
        this._At.Register('+IPD', (line) => this.IpdHandler(line));
        for(let i = 0; i < MAXSOCKETS; i++) {
            this._At.Register(`${i},CONNECT`, (ln) => this.socketOpen(ln));
            this._At.Register(`${i},CLOSED`, (ln) => this.socketClose(ln));
        }
        this._At.RegisterLine('WIFI CONNECTED', () => { H.Logger.Service.Log({service: 'ESP', level: 'I', msg: 'Assotiated.'}); });
        this._At.RegisterLine('WIFI GOT IP', () => { H.Logger.Service.Log({service: 'ESP', level: 'I', msg: 'Connected.'}); Object.emit('connect'); });
        this._At.RegisterLine('WIFI DISCONNECTED', () => { H.Logger.Service.Log({service: 'ESP', level: 'I', msg: 'Disconnected'}); Object.emit('disconnect'); });

        this.Reset()
        .then(() => this.Echo(0))
        .then(() => this.MulSockets(1))
        .then(() => this.CIpdInfo(1))
        .then(() => this.Sleep(0))
        .then(() => callback(null))
        .catch((error) => callback(error));
    }
    /**
     * @method
     * Реализация колбэк функции создания сокета любого типа
     * @param {String} host             - адрес хоста, к которому подключается сокет 
     * @param {Number} port             - порт хоста, к которому подключается сокет
     * @param {String} socketType       - тип соединения 
     * @param {Object} options          - объект с доп свойствами соединения (не используется в прошивке RTOS ESP8266) 
     * @returns {Number} index          - индекс сокета
     */
    Create(host, port, socketType, options){        
        if (this._At === undefined) {
            H.Logger.Service.Log({service: 'ESP', level: 'E', msg: 'Failed to create socket! AT is not initialized!'});
            return -1;
        }

        if (host === undefined && socketType != 2) {// Create server socket at 6th reserved slot
            this._SocketArray[MAXSOCKETS] = { Status: STATUSES[2], Type: TYPES[2], Data: '' };

            const start = Date.now();
            this._At.Execute(`AT+CIPSERVER=1,${port}\r\n`, 10000, (d) => {
                if (d == 'OK') this._SocketArray[MAXSOCKETS].Status = STATUSES[1];
                else {
                    this._SocketArray[MAXSOCKETS] = { Status: STATUSES[0], Type: TYPES[0], Data: undefined };
                    H.Logger.Service.Log({service: 'ESP', level: 'E', msg: `CIPSERVER failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`});
                }
            });
            return MAXSOCKETS;
        }
        else {// Create a client socket
            let index = 0;
            let cmd;
            while (this._SocketArray[index].Status != STATUSES[0]) {
                index++;
                if (index >= MAXSOCKETS) {
                    H.Logger.Service.Log({service: 'ESP', level: 'E', msg: 'Failed to create socket! No free slots!'});
                    return -7;
                }
            }
            if (socketType == 2) {// It's a UDP
                cmd = `AT+CIPSTART=${index},"UDP","${this._UDPEndPoints[index].host}",${this._UDPEndPoints[index].port},3600,2\r\n`;
                this._SocketArray[index] = { Status: STATUSES[2], Type: TYPES[3], Data: undefined };
            }
            else {// It's a TCP
                cmd = `AT+CIPSTART=${index},"TCP","${host}",${port}\r\n`;
                this._SocketArray[index] = { Status: STATUSES[2], Type: TYPES[1], Data: undefined };
            }
            
            const start = Date.now();
            this._At.Execute(cmd,10000,cb = (d) => {                
                //if (d == 'ALREADY CONNECTED') return cb;
                if (d == 'ERROR') {
                    H.Logger.Service.Log({service: 'ESP', level: 'E', msg: `CIPSTART failed. Reason: Timeout after ${Math.floor((Date.now() - start) / 1000)} second(s)`});
                }
            });
            return index;
        }
    }
    /**
     * @method
     * Закрывает указанный сокет, если он уже не является закрытым, или же он не в процессе отправки пакета
     * В таком случае он будет закрыт сразу после завершения отправки в методе Send
     * @param {Number} _index       - индекс сокета, который нужно закрыть 
     */
    Close(_index) {
        console.log('Close');        
        let cmd;
        if (_index == MAXSOCKETS) cmd = 'AT+CIPSERVER=0\r\n';
        else cmd = `AT+CIPCLOSE=${_index}\r\n`;
        this._At.Execute(cmd,1000,() => {
            this._SocketArray[_index].Type = TYPES[0];
            this._SocketArray[_index].Data = undefined;
        })
    }
    /**
     * @method
     * Принимает входящее соединение, если поднят сервер
     * @returns {Number} i      - индекс сокета
     */
    Accept() {
        console.log('Accept');
        /*for(let i = 0; i < MAXSOCKETS; i++) {
            if (this._SocketArray[i].Status == STATUSES[3]) {
                this._SocketArray[i].Status = STATUSES[1];
                this._SocketArray[i].Type = TYPES[4];
                return i;
            }
        }
        H.Logger.Service.Log({service: 'ESP', level: 'E', msg: 'Failed to accept any more clients! No free slots!'});
        return -1;*/
    }
    /**
     * @method
     * Принимает данные с сокета
     * @param {Number} _index           - индекс принимаемого сокета 
     * @param {Number} _maxLen          - длина данных в байтах 
     * @returns {String} str            - строка данных
     */
    Recv(_index, _maxLen) {
        //console.log('Recieve '+_maxLen);
        
        if (this._SocketArray[_index].Data !== undefined) {
            let r;
            if (this._SocketArray[_index].Data.length > _maxLen) {
                r = this._SocketArray[_index].Data.substring(0,_maxLen);
                this._SocketArray[_index].Data = this._SocketArray[_index].Data.substring(_maxLen);
            } 
            else {
                this._SocketArray[_index].Data;
                this._SocketArray[_index].Data = '';
                if (this._SocketArray[_index].Status == STATUSES[5])
                {
                    console.log('Recieved 0');
                    this._SocketArray[_index].Status = STATUSES[0];
                }
            }
            return r;
         }
        //if (socks[sckt]<0) return socks[sckt]; // report an error
        if (this._SocketArray[_index].Type == TYPES[0]) return -1; // close it
        return '';
    }
    Send(_index, _data, _socketType) {
        //console.log('Send '+_data.length);
       // return this.udpToIPAndPort(_data).length+8;
        
        if (this._At.IsBusy() || this._SocketArray[_index].Status == STATUSES[2]) return _data.length;
        if (this._SocketArray[_index].Status == STATUSES[0]) return -1; // close it

       
        let returnVal = _data.length;
        if (this._SocketArray[_index].Type == TYPES[3]) { // UDP
            _data = _data.substr(8,_data.length-8);
        }

        this._At.Execute(`AT+CIPSEND=${_index},${_data.length}\r\n`, 2000, cb = (d) => {
            if (d=='OK') {
                this._At.Register('>', () => {
                    this._At.Unregister('>');
                    this._At.Write(_data);
                });
                return cb;
            } 
            else if (d=="Recv "+_data.length+" bytes" || d=="busy s...") {
                // all good, we expect this
                // Not sure why we get "busy s..." in this case (2 sends one after the other) but it all seems ok.
                console.log("Recv "+_data.length+" bytes");
                return cb;
            } 
            else if (d=="SEND OK") {
                // we're ready for more data now
                if (this._SocketArray[_index].Status == STATUSES[4]) this.Close(_index);
                else this._SocketArray[_index].Status = STATUSES[1];
                return;
            } 
            else { // uh-oh. Error. If undefined it was probably a timeout
                console.log('Error');
                //this._SocketArray[MAXSOCKETS] = { Status: STATUSES[0], Type: TYPES[0], Data: undefined };
                //this._At.Unregister('> ');
                return cb;
            }
        });
        // if we obey the above, we shouldn't get the 'busy p...' prompt
        this._SocketArray[_index].Status = STATUSES[2]; // wait for data to be sent*/
        return returnVal;
    }
    IpdHandler(line) {
        let colon = line.indexOf(":");
        if (colon<0) return line; // not enough data here at the moment

        /*let parms = line.substring(5,colon).split(",");
        parms[1] = 0|parms[1];
        let len = line.length-(colon+1);
        let index = parms[0];
        if (this._SocketArray[index].Type == TYPES[3]) {
            let ip = (parms[2]||"0.0.0.0").split(".").map((x) => {return 0|x;});
            let port = 0|parms[3];
            this._SocketArray[index].Data += String.fromCharCode(ip[0],ip[1],ip[2],ip[3],port&255,port>>8,len&255,len>>8);
        }

        if (len>=parms[1]) {
            // we have everything
            this._SocketArray[index].Data += line.substr(colon+1,parms[1]);
            return line.substr(colon+parms[1]+1); // return anything else
        } 
        else {
            // still some to get - use getData to request a callback
            this._SocketArray[index].Data += line.substr(colon+1,len);
            this._At.getData(parms[1]-len, (data) => { this._SocketArray[index].Data += data; });
            return '';
        }*/
    }      
    socketOpen(ln) {
        let index = ln[0];

        if (this._SocketArray[index].Status == STATUSES[0] && this._SocketArray[MAXSOCKETS].Type == TYPES[2]) {
            // if we have a server and the socket randomly opens, it's a new connection
            this._SocketArray[index].Status = STATUSES[3];
        } 
        else if (this._SocketArray[index].Status == STATUSES[2]) {
            // everything's good - we're connected
            console.log(index+' conn');
            this._SocketArray[index].Status = STATUSES[1];
        } 
        else {
            // Otherwise we had an error - timeout? but it's now open. Close it.
            this._At.Execute(`AT+CIPCLOSE=${index}\r\n`,1000, () => {
                this._SocketArray[index] = { Status: STATUSES[0], Type: TYPES[0], Data: undefined };
                H.Logger.Service.Log({service: 'ESP', level: 'E', msg: `Unexpected socket opens at slot ${index}. Closed!`});
            });
        }
    }    
    socketClose(ln) {
        this._SocketArray[ln[0]] = sockData[ln[0]]!="" ? "DataClose" : undefined;
    }
    udpToIPAndPort(_data) {
        return {
            ip : _data.charCodeAt(0)+"."+_data.charCodeAt(1)+"."+_data.charCodeAt(2)+"."+_data.charCodeAt(3),
            port : _data.charCodeAt(5)<<8 | _data.charCodeAt(4),
            len : _data.charCodeAt(7)<<8 | _data.charCodeAt(6)
        };
    }
    /**
     * @method
     * Перезагружает модуль. Отключается от всех точек доступа, скидывает все параметры в значения
     * по умолчанию, кроме тех, что хранятся во флэш памяти
     * @returns {Promise}
     */
    Reset() {
        return new Promise((res, rej) => {
            const start = Date.now();
            this._At.Execute('\r\nAT+RST\r\n', 10000, cb = (d) => {
                if (d == 'ready') res('OK');
                else if (d === undefined) rej(`Reset failed. Reason: Chip didn't respond after ${Math.floor((Date.now() - start) / 1000)} second(s)`);
                else return cb;
            })
        })
    }
    /**
     * @method
     * Восстанавливает все заводские настройки чипа (включая те, что хранятся во флэш памяти) и перезагружает его.
     * @returns {Promise}
     */
    Restore() {
        return new Promise((res,rej) => {
            const start = Date.now();
            this._At.Execute('AT+RESTORE\r\n', 10000, cb = (d) => {
                if (d != 'ready') return cb;
                else if (d === undefined) rej(`Restore failed. Reason: Chip didn't respond after ${Math.floor((Date.now() - start) / 1000)} second(s)`);
                else res('OK');
            })
        })
    }
    /**
     * @method
     * Включает или выключает эхо АТ команд. При значении 1 любая введённая 
     * АТ команда вернётся отправителю.
     * @param {Number} _val          - значение 0 или 1
     * @returns {Promise}
     */
    Echo(_val) {
        return new Promise((res,rej) => {
            if (![0,1].includes(_val)) rej(`ATE failed. Reason: Value should be 0 or 1 (got "${_val}")`);
            const start = Date.now();
            this._At.Execute('ATE0\r\n', 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else if (d == 'ATE0' || d == 'ATE1') return cb;
                else rej(`ATE failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Настраивает режим энергосбережения
     * @param {Number} _val          - значение 0 - 3
     * @returns {Promise}
     */
    Sleep(_val) {
        return new Promise((res,rej) => {
            if (![0,1,2,3].includes(_val)) rej(`SLEEP failed. Reason: Value should be between 0 and 3 (got "${_val}")`);
            const start = Date.now();
            this._At.Execute(`AT+SLEEP=${_val}\r\n`, 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else rej(`SLEEP failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Включает/выключает запись АТ команд во Flash память, которые будут автоматически выполнены при следующем запуске
     * Список команд, которые могут быть записаны, смотреть в документации
     * @param {Number} _val          - значение 0 или 1
     * @returns {Promise}
     */
    SysStore(_val) {
        return new Promise((res,rej) => {
            if (![0,1].includes(_val)) rej(`SYSSTORE failed. Reason: Value should be 0 or 1 (got "${_val}")`);
            const start = Date.now();
            this._At.Execute(`AT+SYSSTORE=${_val}\r\n`, 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else rej(`SYSSTORE failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Настраивает протокол 802.11 в режим b, b\g или b\g\n.
     * @param {Number} _val          - значение 1,3 или 7
     * @returns {Promise}
     */
    STAProto(_val) {
        return new Promise((res,rej) => {
            if (![1,3,7].includes(_val)) rej(`CWSTAPROTO failed. Reason: Value should be 1,3 or 7 (got "${_val}")`);
            const start = Date.now();
            this._At.Execute(`AT+CWSTAPROTO=${_val}\r\n`, 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else rej(`CWSTAPROTO failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Включение/выключение режима с несколькими соединениями. Возможно при следующих условиях:
     * 1) Сквозная передача (transparent transmission) должна быть выключена (AT+CIPMODE=0);
     * 2) Все сокеты должны быть закрыты при изменении этого параметра;
     * 3) Если включен TCP сервер, то он должен быть выключен (AT+CIPSERVER=0).
     * @param {Number} _val          - значение 0 или 1
     * @returns {Promise}
     */
    MulSockets(_val) {
        return new Promise((res,rej) => {
            if (![0,1].includes(_val)) rej(`CIPMUX failed. Reason: Value should be 0 or 1 (got "${_val}")`);
            const start = Date.now();
            this._At.Execute(`AT+CIPMUX=${_val}\r\n`, 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else rej(`CIPMUX failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Настройка страны
     * @param {String} _ind            - код страны
     * @param {Number} _startch        - номер начального канала (от 1 до 14)
     * @param {Number} _totch          - общее количество каналов 
     * @returns {Promise}
     */
    Country(_ind, _startch, _totch) {
        return new Promise((res,rej) => {
            if (_startch < 1 || _startch > 14) rej(`CWCOUNTRY failed. Reason: Start channel should be between 1 and 14 (got "${startch}")`);
            if ((14 - _startch) > _totch) rej(`CWCOUNTRY failed. Reason: Incorrect amount of total channels (got "${totch}", awailable "${14-startch}")`);
            const start = Date.now();
            this._At.Execute(`AT+CWCOUNTRY=1,"${_ind}",${_startch},${_totch}\r\n`, 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else rej(`CWCOUNTRY failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Включение/выключения передачи сетевых данных (IP-адрес и порт) через Serial-порт (+IPD).
     * Необходимо для открытия сокетов.
     * @param {Number} _val          - значение 0 или 1
     * @returns {Promise}
     */
    CIpdInfo(_val) {
        return new Promise((res,rej) => {
            if (![0,1].includes(_val)) rej(`CIPDINFO failed. Reason: Value should be 0 or 1 (got "${_val}")`);
            const start = Date.now();
            this._At.Execute(`AT+CIPDINFO=${_val}\r\n`, 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else rej(`CIPDINFO failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Устанавливает размер буфера SSL
     * @param {*} _val 
     * @returns 
     */
    SSLSize(_val) {
        return new Promise((res,rej) => {
            if (_val < 2048 || _val > 4096) rej(`CIPSSLSIZE failed. Reason: Value should be between 2048 and 4096 (got "${_val}")`);
            const start = Date.now();
            this._At.Execute(`AT+CIPSSLSIZE=${_val}\r\n`, 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else rej(`CIPSSLSIZE failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Устанавливает режим работы модуля. Доступны следующие значения:
     * 1 - клиент станция;
     * 2 - точка доступа;
     * 3 - станция + точка доступа.
     * Внимание: работа некоторых функций чипа напрямую зависит от установленного режима
     * @param {Number} _val          - значение 1,2 или 3
     * @returns {Promise}
     */
    Mode(_val) {
        return new Promise((res,rej) => {
            if (![1,2,3].includes(_val)) rej(`CWMODE failed. Reason: Value should be 1,2 or 3 (got "${_val}")`);
            const start = Date.now();
            this._At.Execute(`AT+CWMODE=${_val}\r\n`, 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else rej(`CWMODE failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Подключение к точке доступа
     * @param {String} _ssid       - SSID сети, к которой подключаемся
     * @param {String} _pass       - пароль выбранной сети
     * @returns {Promise}
     */
    Connect(_ssid,_pass) {
        return new Promise((res,rej) => {
            const start = Date.now();
            this._At.Execute(`AT+CWJAP="${_ssid}","${_pass}"\r\n`, 20000, cb = (d) => {
                if (["WIFI DISCONNECT","WIFI CONNECTED","WIFI GOT IP","+CWJAP:1"].indexOf(d)>=0) return cb;
                else if (d == 'OK') res(d);
                else {
                    let reason = 'UNKNOWN';
                    switch (parseInt(d.substring(7))) {
                    case 1:
                        reason = `Timeout ${Math.floor((Date.now() - start) / 1000)} seconds`;
                        break;
                    case 2:
                        reason = `Incorrect password`;
                        break;
                    case 3:
                        reason = `Cannot find target access point`;
                        break;
                    case 4:
                    default:
                        reason = `Unknown error. Connection failed`;
                        break;
                    }
                    rej(`CWJAP failed. Reason: ${reason}`);
                }
            })
        })
    }
    /**
     * @method
     * Включает/выключает режим автоподключения к последней подключенной точке доступа.
     * Эта конфигурация сохраняется во флэш-память модуля ESP8266.
     * Команда работает только в режиме +CWMODE:1 (станции-клиента)
     * @param {Number} _val          - значение 0 или 1
     * @returns {Promise}
     */
    AutoConnect(_val) {
        return new Promise((res,rej) => {
            if (![0,1].includes(_val)) rej(`CWAUTOCONN failed. Reason: Value should be 0 or 1 (got "${_val}")`);
            const start = Date.now();
            this._At.Execute(`AT+CWAUTOCONN=${_val}\r\n`, 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else rej(`CWAUTOCONN failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Настраивает интервал и кличество переподключений к точке доступа
     * @param {Number} _interval      - интервал между попытками в секундах. Макс - 7200, 0 - функция отключена. 
     * @param {Number} _retries       - количество попыток переподключения. Макс - 1000, 0 - бесконечно пытаться.
     * @returns {Promise}
     */
    ReConnect(_interval, _retries) {
        return new Promise((res,rej) => {
            if (_interval < 0 || _interval > 7200) rej(`CWRECONNCFG failed. Reason: Interval should be whole number between 0 and 7200 (got "${_interval}")`);
            if (_interval < 0 || _interval > 1000) rej(`CWRECONNCFG failed. Reason: Retires should be whole number between 0 and 1000 (got "${_retries}")`);
            const start = Date.now();
            this._At.Execute(`AT+CWRECONNCFG=${_interval},${_retries}\r\n`, 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else rej(`CWRECONNCFG failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);
            })
        })
    }
    /**
     * @method
     * Отключение от текущей точки доступа
     * @returns {Promise}
     */
    Disconnect() {
        return new Promise((res,rej) => {
            const start = Date.now();
            this._At.Execute('AT+CWQAP\r\n', 1000, cb = (d) => {
                if (d == 'OK') res(d);
                else {rej (`CWQAP failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);}
            })
        })
    }
    /**
     * @method
     * Возвращает имя точки доступа, к которой ESP в данный момент подключена
     * @returns {Promise}
     */
    GetCurrAP() {
        return new Promise((res,rej) => {
            const start = Date.now();
            this._At.Execute('AT+CWJAP?\r\n', 1000, cb = (d) => {
                if (d == 'OK') {return cb;}
                else if (d.startsWith('+CWJAP')) {res(d.substring(8,d.indexOf(',',9)-1));}
                else if (d === undefined) {rej (`Not connected to any access points`);}
                else {rej (`CWJAP? failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);}
            })
        })
    }
    /**
     * @method
     * Возвращает свой текущий IP адрес
     * @returns {Promise}
     */
    GetIP() {
        return new Promise((res,rej) => {
            const start = Date.now();
            this._At.Execute('AT+CIFSR\r\n', 1000, cb = (d) => {
                if (d == 'OK') {return cb;}
                else if (d.startsWith('+CIFSR:STAIP')) {res(d.substring(14,d.indexOf('"',15)));}
                else if (d === undefined) {rej (`Not connected to any access points`);}
                else {rej (`CIFSR? failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);}
            })
        })
    }
    /**
     * @method
     * Проверка задержки до указанного адреса
     * @param {String} _host        - хост, который нужно проверить 
     * @returns 
     */
    Ping(_host) {
        return new Promise ((res,rej) => {
            let time;
            this._At.Execute(`AT+PING="${_host}"\r\n`,15000, cb = (d) => {
                if (d && d[0]=='+') {
                    time=d.substring(1);
                    return cb;
                } 
                else if (d=='OK') res(time); 
                else rej(`No response from host "${_host}"`);
            })
        })
    }
    /**
     * @method
     * Устанавливает доменное имя, по которому можно будет обратиться к чипу в сети
     * @param {String} _host            - имя, под которым будет отображаться хост 
     * @param {String} _serviceType     - тип сервиса 
     * @param {Number} _port            - порт 
     * @returns 
     */
    SetMDNS(_host, _serviceType, _port) {
        return new Promise((res,rej) => {
            this._At.Execute(`AT+MDNS=1,"${_host}","${_serviceType}",${_port}\r\n`,1000, cb = (d) => {
                if (d=='OK') res(d);
                else {rej (`MDNS failed. Reason: Timeout ${Math.floor((Date.now() - start) / 1000)} second(s)`);}
            })
        })        
    }
    CreateUDPSocket(_host, _port) {
        let index = 0;
        while (this._SocketArray[index].Status != STATUSES[0]) {
            index++;
            if (index >= MAXSOCKETS) {
                H.Logger.Service.Log({service: 'ESP', level: 'E', msg: 'No free slots for UDP socket!'});
                return;
            }
        }
        this._UDPEndPoints[index] = {host: _host, port: _port};
    }
}

exports = ESP;