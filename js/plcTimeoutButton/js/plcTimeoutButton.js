class ClassTimeoutButton extends ClassSensor {
    constructor(opts) {
        //ClassSensor.call(this, opts);
        super(opts);   
        this._TimeoutDelay = opts.timeout || 5;
        this._Debounce = this._Debounce = (opts.debounce > 0) ? opts.debounce : 50;

        if (typeof this._TimeoutDelay !== 'number') throw new Error('Invalid delay value');                                           
        this._Led = this._SubDevice[0][0]; 
        this._Led.SetValue(0);
        this._Pins[0].mode('input_pullup');
    }
    Start() {
        if (this._SetWatch) return false;

        this._Channels[0].Value = 1;
        this._Channels[0].Status = 1;

        this._SetWatch = setWatch(this.OnSetWatch.bind(this), 
        this._Pins[0], {
            repeat: true,
            edge: 'falling',
            debounce: this._Debounce
        });
    }
    OnSetWatch() {
        if (this._Channels[0].Value == 1) this._Channels[0].emit('changeState');
        this._Channels[0].Value = 0;
        this._Channels[0].emit('enable');
        
        this._Led.SetValue(1); 

        if (this._Timeout) {
            clearTimeout(this._Timeout);
            this._Timeout = null;
        }

        this._Timeout = setTimeout(() => {
            this._Channels[0].Value = 1;
            this._Channels[0].emit('disable');
            this._Channels[0].emit('changeState');
            this._Led.SetValue(0); 

        }, this._TimeoutDelay * 1000);
    }

    Configure(_chNum, _opts) {
        this._TimeoutDelay = (typeof _opts.timeout === 'number') ? _opts.timeout : this._TimeoutDelay;
        this._Debounce     = (typeof _opts.debounce === 'number') ? _opts.debounce : this._Debounce;
    }
}

exports = ClassTimeoutButton;