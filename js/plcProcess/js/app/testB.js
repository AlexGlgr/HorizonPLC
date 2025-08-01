const LowClass = require('testA.min.js');

class MiddleClass extends LowClass {
    constructor(_val) {
        super(_val);
    }
}

exports = MiddleClass;