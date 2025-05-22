<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# ModulePortSensor

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

Модуль предназначен для работы с цифровыми и аналоговыми портами в рамках фреймворка Horizon Automated. Обеспечивает чтение порта. Модуль разработан в соответствии с нотацией архитектуры датчиков и является потомком класса [ClassSensor](../../plcSensor/res/README.md). Не применяется в прикладном коде.

Каждый i-й канал сенсора относится к i-му переданному в конфиге порту. 

Согласно архитектуре датчиков ModuleSensor, у датчика есть либо цифровой либо аналоговый вход. Следовательно, для взаимодействия с цифровыми и аналоговыми портами создаются 2 отдельных сенсора. Пример ниже.   

</div>

## Конструктор
<div style = "color: #555">

Конструктор принимает данные из конфига. Пример ниже:
```json
"19": {
    "pins": ["P11", "P13", "A3", "A4"],
    "name": "PortSensor",
    "article": "",
    "type": "sensor",
    "channelNames": ["p11_di", "p13_di", "A3_ai", "A4_ai"],
    "typeInSignals": ["digital",  "digital", "analog", "analog"],   // Внимание: именно это поле определяет как модуль будет взаимодействовать с данными портами
    "quantityChannel": 4,
    "modules": ["plcPortSensor.min.js"]
}

```

### Методы
<div style = "color: #555">

- <mark style="background-color: lightblue">Start(_chNum, _period)</mark> - запускает чтение порта;
- <mark style="background-color: lightblue">Stop(_chNum)</mark> - прекращает чтение порта;
- <mark style="background-color: lightblue">Configure(_chNum, _opts)</mark> - настраивает режим работы порта;
- <mark style="background-color: lightblue">GetInfo(_chNum)</mark> - выводит информацию о порте.
</div>

### Возвращаемые данные
<div style = "color: #555">
Как датчик модуль предоставляет считанное значение с порта. Для цифровых портов эо 0 или 1, а для аналоговых - число с плавающей точкой в диапазоне [0, 1].
</div>

### Примеры
#### Использование ModulePortSensor для работы с аналоговыми портами
<div style = "color: #555">

```js
let s_ports = H.DeviceManager.Service.CreateDevice('20');

// Явное задание режима порта
s_ports[3].Configure({ mode: 'analog' });
s_ports[0].Start(20);   
// С флагом force будет проигнорирована проверка режима работы порта и он установится автоматически    
s_ports[1].Start(20, { force: true });

let interval = setInterval(() => {
    s_ports.forEach(port => {
        let info = port.GetInfo();
        console.log(`${info.port+info.num}: ${(port.Value).toFixed(3)}`);
    });

}, 2500);
```

Результат выполнения:
<div align='left'>
    <img src='./example-1.png'>
</div>

</div>

### Зависимости
<div style = "color: #555">

</div>

- <mark style="background-color: lightblue">[plcMQTTGW](../../plcMQTTGW/res/README.md)</mark>
- <mark style="background-color: lightblue">[plcAppError](../../plcAppError/res/README.md)</mark>
</div>
