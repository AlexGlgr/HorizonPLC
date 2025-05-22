//Создание объекта класса
let tmp = H.DeviceManager.Service.CreateDevice('tmp')[0];
// Запускаем опрос 
tmp.Start(300);

// Выводим в консоль значения пока канал вкл.
let interval = setInterval(() => {
    if (tmp.Status)
        console.log(`TMP value is ${(tmp.Value).toFixed(1)}`);
}, 2000);