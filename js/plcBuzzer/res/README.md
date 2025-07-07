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

Модуль предназначен для прикладной работы пьезозуммерами в рамках фреймворка Horizon Automated и обеспечивает следующий функционал:
- Инициализацию и идентификацию различных моделей пьезозуммеров в соответствии с их характеристиками;
- Включение пьезозуммера с заданной частотой;
- Генерация различных звуковых паттернов и их проигрыш посредством выполнения тасков.

Модуль разработан в соответствии с [архитектурой актуаторов](../../plcActuator/res/README.md), соответственно, *ClassBuzzer* наследует и реализует является функционал *ClassActuator*, а прикладная работа с данным модулем выполняется через *ClassChannelActuator*, который обеспечивает унифицированный интерфейс.

</div>

## Конструктор
<div style = "color: #555">

Для создания объекта **Buzzer** требуется указать в конфиге его используемый пин, а так же максимальную частоту на которой предполагается его использовать. 
Пример конфигурации:
```json
"bz": {
    "pins": ["A3"],
    "name": "Buzzer",
    "maxFreq": 3000,
    "article": "02-501-0204-000-0001",
    "type": "actuator",
    "channelNames": ["freq"],
    "quantityChannel": 1,
    "modules": ["plcBuzzer.min.js"]
}
```

</div>

### Поля
<div style = "color: #555">

- <mark style="background-color: lightblue">_MaxFreq</mark> - максимальная частота звучания.
</div>

### Методы
<div style = "color: #555">

- <mark style="background-color: lightblue">SetValue(_chNum, _val)</mark> - запускает звучание на заданной частоте (0 ~ 0, 1 ~ maxFreq).

</div>

### Примеры
#### Инициализация и запуск пьезо-зуммера
<div style = "color: #555">

```js
//Инициализация 
const bz = H.DeviceManager.Service.CreateSensor('bz')[0];
//Запуск работы зуммера с частотой 60% от maxFreq
bz.SetValue(0.6);
//Запуск с другой частотой через 1 сек
setTimeout(() => { 
    bz.SetValue(0.4) 
}, 1500);
//Прекращение работы
setTimeout(() => { 
    bz.SetValue(0)
}, 3000);
```

</div>

#### Запуск цепочки тасков
<div style = "color: #555">

```js
//Вызов одного пика через основной, универсальный таск 
bz.RunTask('PlaySound', { value: 0.3, numRep: 1, prop: 0.5, pulseDur: 800 })
.then(
    // Вызов пика через таск, принимающий в качестве аргументов k, пропорциональный частоте и длину импульса 
    () => bz.RunTask('BeepOnce', 0.5, 800)
).then(
    // вызов двойного звукового сигнала
    () => bz.RunTask('BeepTwice', 0.8, 500)                   
).then(
    () => { console.log('Done!'); }
);
```

</div>

#### Добавление нового таска
<div style = "color: #555">

```js
//Объявление элементарного таска, запускающего зуммер на 3 сек
bz.AddTask('Beep3sec', (_val) => {
    this.SetValue(_val);
    setTimeout(() => {
        this.SetValue(0);
        //Завершение выполнения таска
        this.ResolveTask(0);
    }, 3000);
});

bz.RunTask('Beep3sec', 0.5)
    .then(() => print(`Done after 3 sec!`));
```

</div>

#### Отмена выполнения таска после его вызова 
<div style = "color: #555">

```js
bz.RunTask('BeepTwice', 0.5, 1200);

setTimeout(() => {
    bz.CancelTask();
}, 1000);
```

</div>

#### Результат выполнения:

<div align='left'>
    <img src="" alt="Image not found">
</div>

### Зависимости
<div style = "color: #555">

- <mark style="background-color: lightblue">[plcActuator](../../plcActuator/res/README.md)</mark>
- <mark style="background-color: lightblue">[plcAppError](../../plcAppError/res/README.md)</mark>
</div>

</div>
