//Создание объекта класса
let pot = H.DeviceManager.Service.CreateDevice('pot')[0];
// Меняем диапазон на [0, 10]
pot.Transform.SetLinearFunc(10, 0);
// Запускаем опрос 
pot.Start();

// Выводим в консоль значение если оно существенно обновилось
let val = 0;
let interval = setInterval(() => {
  if (Math.round(pot.Value) !== val) {
    val = Math.round(pot.Value);
    console.log(`potentiometer value is ${val}`);
  }
}, 50);
// Теперь постепенно меняем положение потенциометра