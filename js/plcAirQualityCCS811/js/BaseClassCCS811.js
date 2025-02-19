// Air Quality Gas sensor low level class

// Constants
WHO_I_AM        = 0x81;
STATUS_APP_REA  = 0x10;
STATUS_DAT_REA  = 0x08;
STATUS_FM_MODE  = 0x80;

// Registers
REG_STAT        = 0x00;
REG_MEAS_MODE   = 0x01;
REG_RES_DATA    = 0x02;
REG_ENV_DATA    = 0x05;
REG_BASELINE    = 0x11;
REG_WHO_AM_I    = 0x20;
REG_BOOTLOAD    = 0xF4;
REG_SOFT_RESET  = 0xFF;

// Measurement modes
MM_IDLE         = 0x00;
MM_PER_1_SEC    = 0x10;
MM_PER_10_SEC   = 0x20;
MM_PER_60_SEC   = 0x30;
MM_PER_250_MS   = 0x40;

// Class initialization
let AirQuality = function(bus, address, mode) {
    this._i2c = bus || I2C1;
    this._address = address || 0x5A;
    this._mode = mode || 1;
};

// The method writes data to the reg register
AirQuality.prototype.writeI2C = function(reg, data) {
    this._i2c.writeTo(this._address, [reg, data]);
};

// The method reads from the reg register the number of bytes count
AirQuality.prototype.readI2C = function(reg, count) {
    if (count === undefined) {
        count = 1;
    }
    this._i2c.writeTo(this._address, [reg, 0x80]);
    return this._i2c.readFrom(this._address, count);
};

// Module start
AirQuality.prototype.init = function() {
    this.writeI2C(REG_SOFT_RESET, [0x11, 0xE5, 0x72, 0x8A]);
    setTimeout(() => {
        let wia = this.whoAmI();
        //console.log(wia);
        if (wia === WHO_I_AM) {        
            if (this.readI2C(REG_STAT) & STATUS_APP_REA) {
                this.writeI2C(REG_BOOTLOAD, []);
                setTimeout(() => {
                    if (this.readI2C(REG_STAT) & STATUS_FM_MODE) {
                        this.setMode(this._mode);
                    }
                    else {
                        throw "Failed to boot firmware!";
                    }
                }, 100);
            }
            else {
                throw "No application firmware loaded!";
            }
        }
        else {
            throw `Failed 'WHO AM I' check! ${wia}`;
        }
    }, 200);
};

// The method returns the device identifier
AirQuality.prototype.whoAmI = function() {
    return this.readI2C(REG_WHO_AM_I)[0];
};

// Get register value for corresponding mode number
AirQuality.prototype.getDriveMode = function(mode) {
    switch (mode) {
      case 0: return MM_IDLE;
      case 1: return MM_PER_1_SEC;
      case 2: return MM_PER_10_SEC;
      case 3: return MM_PER_60_SEC;
      case 4: return MM_PER_250_MS;
      default: throw "Invalid mode!" + mode;
    };
};

// Set sensor mode
AirQuality.prototype.setMode = function (mode) {
    let drivemode = this.getDriveMode(mode);
    this._mode = mode;
    this.writeI2C(REG_MEAS_MODE, drivemode);
};

AirQuality.prototype.setEnvData = function (hum, temp) {
    if (isNaN(hum)) {throw 'CCS811 RH NaN!';}
    if (isNaN(temp)) {throw 'CCS811 Temp NaN!';}
    if (!(hum >= 0 && hum <= 100)) {throw 'CCS811 RH invalid!';}
  
    let humiData = hum * 512
    let tempData = (Math.max(-25, temp) + 25) * 512
  
    let regData = [(humiData >> 8), (humiData & 0xFF), tempData >> 8, tempData & 0xFF]
    this.writeI2C(REG_ENV_DATA, regData);
};

AirQuality.prototype.get = function() {
    let data = this.readI2C(REG_RES_DATA, 5);
    let isNew = (data[4] & STATUS_DAT_REA) != 0;
    return {
      eCO2: (data[0] << 8) | data[1],
      TVOC: (data[2] << 8) | data[3],
      new: isNew
    };
};

exports.connect = function(bus, address, mode) {
    return new AirQuality(bus, address, mode);
};