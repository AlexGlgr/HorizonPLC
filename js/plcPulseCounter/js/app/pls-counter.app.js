let pulseSensor = H.DeviceManager.Service.CreateDevice('22');
let total = pulseSensor[0];
let perSec = pulseSensor[1];

total.Start({edge:'falling', debounce: 0});

let a = setInterval(() => {
    console.log(`Total count: ${total.Value}`);
    console.log(`Per second: ${perSec.Value}`);
}, 250);