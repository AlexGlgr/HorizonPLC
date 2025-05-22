<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# ModulePotentiometer

<div style = "color: #555">
    <p align="center">
    <img src="logo.png" width="400" title="hover text">
    </p>
</div>

## Лицензия

<div style = "color: #555">
В разработке
</div>

## Описание
<div style = "color: #555">

Модуль предназначен для работы с аналоговым сервоприводом в рамках фреймворка Horizon Automated. Разработан в соответствии с нотацией архитектуры датчиков и является потомком класса [ClassSensor](../../plcSensor/res/README.md). Количество каналов - 1. 

</div>

## Конструктор
<div style = "color: #555">

Конструктор принимает данные из конфига.
```json
"pot": {
    "pins": ["A3"],
    "name": "Potentiometer",
    "article": "02-501-0103-201-0001",
    "type": "sensor",
    "channelNames": ["position"],
    "quantityChannel": 1,
    "modules": ["plcPotentiometer.min.js"]
}
```
</div>

### Поля
<div style = "color: #555">

- <mark style="background-color: lightblue">_Interval</mark> - поле для хранения ссылки на интервал опроса датчика.
</div>

### Методы
<div style = "color: #555">

- <mark style="background-color: lightblue">Start()</mark> - запускает циклический опрос измерительного канала датчика;
- <mark style="background-color: lightblue">Stop()</mark> - прекращает считывание значений с заданного канала;
</div>

### Возвращаемые данные
<div style = "color: #555">
Датчик предоставляет данные об позиции, в которой находится потенциометр. По-умолчанию датчик возвращает число от 0 до 1.
Для градуировния показаний с рекомендуется скалировать их к желаемому к диапазону `pot_ch.Transform.SetLinearFunc(k, b)`; 
При k=1, b=0 показания приводятся к диапазону  [0, 100] (с сохранением дробной части);
При `k=1` и `b=0` выводятся изначальные показания потенциометра в диапазоне [0, 1].
</div>

### Примеры
<div style = "color: #555">
Пример программы для вывода данных раз в одну секунду:

```js
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
```
Результат выполнения:
<div align='left'>
    <img src='./example-1.png'>
</div>

</div>

### Зависимости
<div style = "color: #555">

- <mark style="background-color: lightblue">[plcSensor](../../plcSensor/res/README.md)</mark>
- <mark style="background-color: lightblue">[plcAppError](../../plcAppError/res/README.md)</mark>
</div>

</div>
