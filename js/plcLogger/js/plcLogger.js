/**
 * @class
 * Класс предоставляет инструменты для логирования 
 */
class ClassLogger {
    /**
     * @constructor
     */
    constructor(options) {
        if (this.Instance) {
            return this.Instance;
        } else {
            ClassLogger.prototype.Instance = this;
        }        
        if (typeof options.server !== 'undefined') {
            this._Name = 'Logger'; //переопределяем имя типа
            this._Server = options.server || '192.168.50.251';
            this._Port = options.port || 5142;
            this._Msg = {
                version    : '1.1',
                host       : options.hostname || Process._BoardName,
                facility   : options.facility || 'HorizonPLC',
                service_bus    : 'appBus'
            }
            this._BufferSize = options.bufferSize || 1350;
            this._Socket;
            this._Debug = options.debug || false;
            this._gl = true;
        }
        else {
            this._gl = false;
        }
        
        this.netlock = false;
    }
    InitConsoleOutput() {
        ;
    }
    InitGraylogOutput() {
        ;
    }
    /**
     * @method
     * @description
     * Выводит сообщение в консоль и подготавлиеввает его к отправке в Graylog
     * @param {Number} _msg           - сообщение для логирования
     * @returns 
     */
    Log(_msg) {
        let flevel = -1;
        let fdesc = 'Unknown';
        const logdesc = ['CRITICAL', 'ERROR', 'WARNING', 'NOTICE', 'INFO', 'DEBUG'];      
        const level = logdesc.indexOf(logdesc.find((lvl) => lvl.startsWith(_msg.level.toUpperCase())));
        if (level != -1) {
            fdesc = logdesc[level];
            flevel = level+2;
        }

        if (Process._HaveNet && this._gl) {
            if (this._Socket === undefined){
                this._Socket = H.Network.Service.CreateSocket(this._Server, this._Port, 'udp', this._Name);
            }

            this.WriteToGraylog({message: _msg.msg, level: flevel, level_desc: fdesc, service: _msg.service, full_message: _msg.obj || {}});
        }
        else if (level <= 1){
            this.WriteToFile({service: _msg.service, fdesc: fdesc, msg: _msg.msg})
        }
        this.WriteToConsole({service: _msg.service, fdesc: fdesc, msg: _msg.msg});
    }
    /**
     * @method
     * 
     */
    WriteToGraylog(_msg) {
        Object.assign(this._Msg, _msg);
        const toSend = JSON.stringify(this._Msg);
        try {
            this._Socket.send(toSend, 0, toSend.length, this._Port, this._Server, (err, bytes) => {
                if (err || bytes > this._BufferSize) {throw err;}
            });
        }
        catch (e) {
            if (!this.netlock) {
                this.netlock = true;
                sysbuzz.RunTask('BeepTwice', 0.8, 300);
                this.WriteToConsole({service: this._Name, fdesc: 'ERROR', msg: `Error sending UDP packet: ${e}`});
                this.WriteToFile({service: this._Name, fdesc: 'ERROR', msg: `Error sending UDP packet: ${e}`});
                /*this._Socket.close();
                H.Network.Service.Reset(() => {
                    this.netlock = false;
                    this._Socket = require('dgram').createSocket('udp4');
                });*/
            }            
        }
    }
    /**
     * @method
     * 
     */
    WriteToConsole(_msg) {
        console.log(`[${Process.GetSystemTime()}] ${_msg.service} | ${_msg.fdesc} | ${_msg.msg}`);
    }
    /**
     * @method
     * 
     */
    WriteToFile(_msg) {
        if (require("Storage").open('syslog.txt', 'r').getLength() < 3000) {
            require("Storage").open('syslog.txt', 'a').write(`[${Math.floor(Date.now() / 1000)}] ${_msg.service} | ${_msg.fdesc} | ${_msg.msg}\n`);
        }
    }
}
exports = ClassLogger;