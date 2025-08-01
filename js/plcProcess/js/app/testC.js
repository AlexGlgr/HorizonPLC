const MiddleClass = require('testB.min.js');

class UpperClass extends MiddleClass {
    constructor(_val) {
        super(_val);
    }
}

exports = UpperClass;