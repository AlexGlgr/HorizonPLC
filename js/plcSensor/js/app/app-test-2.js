const sht_tmp = H.DeviceManager.Service.CreateDevice('sht')[0];

//Запуск и вывод показаний
sht_tmp.Start();
let post = '°C';
setInterval(() => {
    console.log(`Value = ${(sht_tmp.Value).toFixed(2)} ${post}`);
}, 2000);

setTimeout(() => {
    //Настройка перевода значений в Фаренгейты
    sht_tmp.Transform.SetLinearFunc(1.8, 32);
    post = 'F';
}, 4000);
