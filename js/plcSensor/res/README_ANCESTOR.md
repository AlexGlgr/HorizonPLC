<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# ClassAncestorSensor 
<div style = "color: #555">
    <p align="center">
    <img src="logo.png" width="400" title="hover text">
    </p>
</div>

## Описание
<div style = "color: #555">

Базовый класс в стеке [plcSensor](./README.md). Является отправной точкой для создания объектов конкретных датчиков и обеспечивает сбор и хранение информации о них. Его поля предоставляют основные характеристики, необходимых для идентификации и настройки датчика в рамках фреймворка Horizon Automated. В первую очередь собирает в себе самые базовые сведения о датчике: переданные в его конструктор параметры и описательную характеристику. Перечень полей см. ниже.
</div>

### Конструктор
<div style = "color: #555">

Конструктор принимает объект типа **SensorOptsType**, наполнение которого определяется конфигом. Единственный нюанс в том, что при получении данных из конфига, еще до вызова конструктора объекта датчика, строковое представление *bus* и *pins* преобразуется в js-объекты. 

Рассмотрим основной набор параметров на примере конфига к [VL6180](../../plcLightVL6180X/res/README.md). Детальное пояснение к параметрам описано [ниже](./README_ANCESTOR.md/#поля).


```json
"vl": {                 // ID датчика
    "bus": "I2C10",       
    "address": 41,      // обязательный параметр для модулей, работающих по I2C
    "quantityChannel": 2,                   
    "name": "VL6180",                       
    "article": "02-501-0105-201-0004",           
    "type": "sensor",              
    "channelNames": ["light", "range"],
    "modules": ["plcVL6180.min.js"]
}
```

Также можно передавать следующие свойства:
- <mark style="background-color: lightblue">repeatability</mark> - повторяемость;
- <mark style="background-color: lightblue">precision</mark> - точность;
- и различные специфичные для датчиков параметры; но важно учитывать, что их обработка уже сугубо в ответственности прикладного модуля.

</div>

### Поля
<div style = "color: #555">

- <mark style="background-color: lightblue">_Bus</mark> - используемая шина;
- <mark style="background-color: lightblue">_Pins</mark> - массив используемых датчиком пинов;
- <mark style="background-color: lightblue">_Address</mark> - адрес датчика на шине;
- <mark style="background-color: lightblue">_QuantityChannel</mark> - число каналов датчика, реализуемых модулем;
- <mark style="background-color: lightblue">_Id</mark> - идентификатор датчика;
- <mark style="background-color: lightblue">_Article</mark> - артикль датчика; необходим для идентификации датчика на верхнем уровне (на серверной стороне); 
- <mark style="background-color: lightblue">_Name</mark> - имя датчика;
- <mark style="background-color: lightblue">_Type</mark> - тип устройства: "sensor" либо "hybrid". Пример гибрида - кнопка с LED-индикатором;
- <mark style="background-color: lightblue">_ChannelNames</mark> - массив с названиями каналов;
- <mark style="background-color: lightblue">_TypeInSignal</mark> - тип входного сигнала;
- <mark style="background-color: lightblue">_TypeOutSignal</mark> - тип выходного сигнала;
- <mark style="background-color: lightblue">_Repeatability</mark> - повторяемость;
- <mark style="background-color: lightblue">_Precision</mark> - точность;
- <mark style="background-color: lightblue">_ManufacturingData</mark> - объект со сведениями о производителе и поставщике датчика;
</div>

### Методы
<div style = "color: #555">

- <mark style="background-color: lightblue">CheckProps()</mark> - проверяет валидность некоторых полей датчика.
</div>

### Примеры
<div style = "color: #555">

Данный класс применяется исключительно как звено наследования и не используется независимо. Потому наследники обязаны иметь такие же параметры конструктора, который ввиду особенностей среды выполнения Espruino вызывается таким образом:
```js
ClassAncestorSensor.call(this, _opts);
либо
ClassAncestorSensor.apply(this, [_opts]);
```
</div>

### Зависимости
<div style = "color: #555">

- <mark style="background-color: lightblue">[plcAppError](../../plcAppError/res/README.md)</mark>
</div>

</div>