//Инициализация каналов датчика
let vl6180_channels = H.DeviceManager.Service.CreateDevice('vl');

const ch0 = vl6180_channels[0];
const ch1 = vl6180_channels[1];
ch0.Start();
ch1.Start();

setInterval(() => {
    if (ch0.Status)
        console.log((ch0.Value).toFixed(1) + "lux");
    if (ch1.Status)
        console.log((ch1.Value).toFixed(1) + "mm");
}, 1000);