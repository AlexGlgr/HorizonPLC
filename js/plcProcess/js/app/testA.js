/**
 * @class
 * Тестовый класс для проверки наследования на версии 2v27 Espruino
 */
class LowClass {
    constructor(_val) {
        this.FieldA = _val + 1;
        this.Sum();
    }
    Sum() {
        console.log('Value: ', this.FieldA);
    }
}

exports = LowClass;