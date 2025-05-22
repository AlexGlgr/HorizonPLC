<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# ModuleBistableButton

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

Модуль предназначен для работы с бистабильными цифровыми кнопками в рамках фреймворка Horizon Automated. Модуль разработан в соответствии с нотацией архитектуры датчиков и является потомком класса [ClassSensor](../../plcSensor/res/README.md). Взаимодействие осуществляется через 0-й канал. 

Особенность бистабильной кнопки заключается в том, что при клике она изменяет свое состояние и сохраняет его до следующего клика. 

В контексте Horizon бистабильная кнопка является гибридом, в котором основное устройство - датчик. Поэтому использование данного модуля предусматривается только с применением цветовой индикации (кнопки со светодиодом).

</div>

## Конструктор
<div style = "color: #555">

Конструктор принимает данные из конфига. Пример ниже:
```json
"btnLed": {
    "pins": ["P11"],
    "name": "BtnLED",
    "article": "",
    "type": "actuator",
    "quantityChannel": 1,
    "modules": ["plcLED.min.js"]
},
"btn": {
    "pins": ["A3"],
    "subChannels": ["btnLed-0"],    // можно задать массив каналов
    "defaultState": 1,  // 0 - вкл, 1 - выкл (по умолчанию)
    "name": "BistableButton",
    "article": "",
    "type": "hybrid",   // Обратите внимание!
    "channelNames": ["press"],
    "quantityChannel": 1,
    "modules": ["plcBistableButton.min.js"]
}
```
</div>

### Поля
<div style = "color: #555">

- <mark style="background-color: lightblue">_SubChannels_</mark> - поле родительского класса; ссылка на исполнительный канал/-ы LED индикатора на кнопке;
- <mark style="background-color: lightblue">_DefaultState</mark> - статус кнопки при запуске;
- <mark style="background-color: lightblue">_Debounce</mark> - "антидребезг" при мониторинге кнопки;
- <mark style="background-color: lightblue">_TimeoutDelay</mark> - время таймаута в секундах.

</div>

### Методы
<div style = "color: #555">

- <mark style="background-color: lightblue">Start()</mark> - запускает мониторинг состояния кнопки;
- <mark style="background-color: lightblue">Stop()</mark> - прекращает мониторинг состояния кнопки;
- <mark style="background-color: lightblue">ChangeState(_interruptState)</mark> - обработчик прерываний;
- <mark style="background-color: lightblue">OnChangeState(_interruptState)</mark> - обработчик смены состояния кнопки;
- <mark style="background-color: lightblue">Configure(_chNum, _opts)</mark> - настройка антидребезга и автовыкл. кнопки;
</div>

### События
<div style = "color: #555">

- <mark style="background-color: lightblue">enable</mark> - включение;
- <mark style="background-color: lightblue">disable</mark> - выключение;
- <mark style="background-color: lightblue">changeState</mark> - смена состояния;
</div>

### Возвращаемые данные
<div style = "color: #555">
Как датчик модуль предоставляет данные о состоянии кнопки: 0-вкл, 1-выкл.
</div>

### Примеры
#### События enable, disable, changeState
<div style = "color: #555">

```js
let btn = H.DeviceManager.Service.CreateDevice('18')[0];
btn.Start();

btn.on('enable',      () => { print('on'); });
btn.on('disable',     () => { print('off'); });
btn.on('changeState', () => { print('change state'); });

// Теперь кликнем по кнопке
```

Результат выполнения:
<div align='left'>
    <img src='./example-3.png'>
</div>

### Таймаут-кнопка
```js
btn.Configure({ timeout: 5000 }); 
// После перехода в состояние ВКЛ, кнопка вернется в ВЫКЛ спустя 5 сек.
```

</div>

### Зависимости
<div style = "color: #555">

- <mark style="background-color: lightblue">[plcSensor](../../plcSensor/res/README.md)</mark>
- <mark style="background-color: lightblue">[plcAppError](../../plcAppError/res/README.md)</mark>
</div>

</div>
