<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# ModuleBuzzer

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

Модуль предназначен для работы со светодиодами во фреймворке Horizon Automated и обеспечивает следующий функционал:
- Инициализацию и идентификацию различных моделей светодиодов вне зависимости от их характеристик;
- Регулировка яркости и частоты работы светодиода;
- Генерация индикационных паттернов и их проигрыш посредством выполнения тасков.

Модуль разработан в соответствии с [архитектурой актуаторов](../../plcActuator/res/README.md), соответственно, *ClassLED* наследует и реализует является функционал *ClassActuator*, а прикладная работа с данным модулем выполняется через *ClassChannelActuator*, который обеспечивает унифицированный интерфейс.

</div>

## Конструктор
<div style = "color: #555">

Для создания объекта **Buzzer** требуется указать в конфиге его используемый пин, а так же максимальную частоту на которой предполагается его использовать. 
Пример конфигурации:
```json
"led": {
    "pins": ["A3"],
    "name": "Led",
    "article": "02-501-0704-201-0002",
    "type": "actuator",
    "channelNames": ["lumen"],
    "quantityChannel": 1,
    "modules": ["plcLED.min.js"]
}
```

</div>

### Поля
<div style = "color: #555">

</div>

### Методы
<div style = "color: #555">

- <mark style="background-color: lightblue">SetValue(_chNum, _val, _opts)</mark> - запускает свечение с яркостью *_val* на частоте, заданной в _opts.

</div>

### Примеры
#### Инициализация и запуск пьезо-зуммера
<div style = "color: #555">

```js
//Инициализация 
const led = H.DeviceManager.Service.CreateSensor('led')[0];
// Установка максимальной яркости в 50%
led.Suppression.SetLim(0, 0.5);
//Свечение зуммера на 40% яркости с частотой 60% от maxFreq
led.SetValue(0.4);
//Запуск с другой яркостью и частотой через 1 сек
setTimeout(() => { 
    led.SetValue(0.1, { freq: 120 }); 
}, 1500);
// Выключение
setTimeout(() => { 
    led.SetValue(0);
}, 3000);
```

</div>


### Зависимости
<div style = "color: #555">

</div>

- <mark style="background-color: lightblue">[plcActuator](../../plcActuator/res/README.md)</mark>
- <mark style="background-color: lightblue">[plcAppError](../../plcAppError/res/README.md)</mark>
</div>
