const vl6180 = H.DeviceManager.CreateDevice('vl'); 
const ch0 = vl6180[0];
const ch1 = vl6180[1];

//Установка для 1-го канала корректирующей функции f(x) = 0.1 * x 
//для преобразования итогового значения в см из мм.
ch1.Transform.SetLinearFunc(0.1, 0);
//Установка для 1-го канала ограничителей в 0.5 и 20 см
ch1.Suppression.SetLim(0.5, 20);
//Установка глубины фильтрации для 0-го канала
ch0.AvgCapacity = 5;

ch1._Alarms.SetZones({
    red: {
        low:    5, 
        high:   Infinity, 
        cbLow:  () => { console.log('OBSTACLE VERY CLOSE: ' + ch1.Value + " cm"); }, 
        cbHigh: () => { console.log('OBSTACLE NEAR'); }
    },
    green: {
        cb: () =>     { console.log('NO OBSTACLES AHEAD')}
    }
});

// Запуск опроса обоих канала
ch0.Start();
ch1.Start();

//Вывод показаний с датчика раз в 1 сек.
setInterval(() => {
    if (ch0.Status)
        console.log(ch0.Value + " lux");
    if (ch1.Status)
        console.log(ch1.Value + " mm");
        console.log('\n');
}, 1000);

//Прекращение опроса 0-го канала через 5 сек.
setTimeout(() => {
    ch0.Stop();
    console.log("ch0 stopped");
}, 3000);
//Прекращение опроса 1-го канала через 10 сек.
setTimeout(() => {
    ch1.Stop();
    console.log("ch1 stopped");
}, 10000);

