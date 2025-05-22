<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# ClassChannel
<div style = "color: #555">
    <p align="center">
    <img src="./res/logo.png" width="400" title="hover text">
    </p>
</div>

### Описание
<div style = "color: #555">

Компонент [ModuleActuator](./README_MIDDLE.md), который представляет каждый отдельно взятый канал актуатора. В парадигме фрейморка Horizon Automated именно через объект этого класса происходит прикладная работа с актуатором. Является "синглтоном" для основного объекта актуатора. Хранит в себе ссылки на основной объект актуатора и некоторые его методы.  

Прикладная работа с актуатором выполняется посредством делегирования [тасков](./README_TASK.md), которые имеют под собой механизмы контроля над статусом их выполнения и упорядочивания их вызовов.

Также данный класс композирует в себе сервисные классы (см. [ClassDataRefine](./README_DATA_REFINE.md) и [ClassAlarms](./README_ALARMS.md)), которые безусловно используются при подаче сигнала на устройство. 
</div>

### Поля
<div style = "color: #555">

- <mark style="background-color: lightblue">_Actuator</mark> - ссылка на основной объект актуатора;
- <mark style="background-color: lightblue">_ChNum</mark> - номер канала;
- <mark style="background-color: lightblue">_Alarms</mark> - объект класса ClassAlarms;
- <mark style="background-color: lightblue">_Transform</mark> - объект класса ClassTransform;
- <mark style="background-color: lightblue">_Suppression</mark> - объект класса ClassSuppression;
</div>

### Аксессоры
<div style = "color: #555">

- <mark style="background-color: lightblue">CountChannels</mark> - возвращает количество корректно инициализированных каналов типа **ClassChannelActuator**;
- <mark style="background-color: lightblue">Suppression</mark> - возвращает объект *ClassSuppression*;
- <mark style="background-color: lightblue">Transform</mark> - возвращает объект *ClassTransform*;
- <mark style="background-color: lightblue">Alarms</mark> - возвращает объект *ClassAlarms* после его инициализации;
- <mark style="background-color: lightblue">ID</mark> - возвращает идентификатор актуатора (канала);
- <mark style="background-color: lightblue">ActiveTask()</mark> - возвращает активный в данный момент таск либо null.
</div>

### Методы
<div style = "color: #555">

- <mark style="background-color: lightblue">SetValue(_val, _opts)</mark>
- <mark style="background-color: lightblue">Configure(_opts)</mark>
- <mark style="background-color: lightblue">Reset(_opts)</mark>
- <mark style="background-color: lightblue">GetInfo(_opts)</mark>

Перечисленные выше методы ссылаются на методы, объявленные в **ClassActuator** и реализованные в прикладном классе актутатора. Их развернутое описание [по ссылке](./README_MIDDLE.md#методы).

- <mark style="background-color: lightblue">InitTasks()</mark> - инициализирует базовые таски актуатора;
- <mark style="background-color: lightblue">AddTask(_name, _func)</mark> - создает новый таск на основе переданной функции и помещает его в коллекцию по переданному имени. Создает одноименный геттер на данный таск;
- <mark style="background-color: lightblue">RemoveTask(_name)</mark> - удаляет таск по его идентификатору;
- <mark style="background-color: lightblue">RunTask(_name, ...args)</mark> - запускает выполнение таска по его идентификатору;
- <mark style="background-color: lightblue">ResolveTask(_code)</mark> - Устанавливает текущий активный таск как выполненный;
- <mark style="background-color: lightblue">CancelTask()</mark> - прерывает выполнение текущего таска. Не рекомендуется к использованию, так как может вызвать ошибки.

</div>

### Зависимости
<div style = "color: #555">

- <mark style="background-color: lightblue">[ClassTask](./README_TASK.md)</mark>
- <mark style="background-color: lightblue">[ClassAppError](../../plcAppError/res/README.md)</mark>
</div>

</div>