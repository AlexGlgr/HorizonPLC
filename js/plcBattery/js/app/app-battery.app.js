// Создание объекта класса
let battery = H.DeviceManager.Service.CreateDevice('14');
let charge = battery[0];
let voltage = battery[1];
charge.Start();

let interval = setInterval(() => {
    console.log(`Current charge is ${(charge.Value).toFixed(0)} %`);
    console.log(`Current voltage on battery is ${(voltage.Value).toFixed(2)} V`);
}, 30000);
