class ClassUtils {
    constructor () {
        if (this.Instance) {
            return this.Instance;
        } else {
            ClassUtils.prototype.Instance = this;
        }
    }
    CheckEmergencyBtn() {
        let hold = 0;
        let cleanStart;

        for (let i = 0; i < 100; i++) {
            hold += digitalRead(BTN1);
        }
        try {
            cleanStart = (__FILE__ === 'SysDeadEnd') ? false : true;
        }
        catch (e) {
            cleanStart = true;
        }
        if (hold >= 70 && cleanStart) {
            load('SysDeadEnd');
            cleanStart = false;
        }
        return cleanStart;
    }
    PullDownPins() {
        const pins = require('Storage').readJSON('ports.json', true).ports;
        let p;
        pins.forEach(pin => {
            try {
                p = eval(pin);
            } catch (e) { }
            if (p instanceof Pin) {
                pinMode(p, 'input', true)
            }
        });
    }
    PrintLogo() {
        console.log("    __  __           _                          _______");
        console.log("   / / / /___  _____(_)___  ____  ____         / / ___/");
        console.log("  / /_/ / __ \\/ ___/ /_  / / __ \\/ __ \\   __  / /\\__ \\ ");
        console.log(" / __  / /_/ / /  / / / /_/ /_/ / / / /  / /_/ /___/ / ");
        console.log("/_/ /_/\\____/_/  /_/ /___/\\____/_/ /_/   \\____//____/  ");
        console.log("");
        console.log('Based on Horizon Automated v0.9.1');
    }
}

exports = ClassUtils;