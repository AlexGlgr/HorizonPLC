<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# ClassTransform
<div style = "color: #555">
    <p align="center">
    <img src="./res/logo.png" width="400" title="hover text">
    </p>
</div>

### Описание
<div style = "color: #555">

Сервисный класс из стека [plcActuator](README.md). Предназначен для обеспечении математической обработки входного сигнала актуатора (линейной либо иной).

Объект класса автоматически инициализируется в поле *_Transform* класса [ClassChannelActuator](./README_CHANNEL.md). Методы для преобразования данных вызываются автоматически при обработке значений измерительного канала.

</div>

### Поля
<div style = "color: #555">

- <mark style="background-color: lightblue">_TransformFunc</mark> - функция трансформации, которая вызывается из ClassChannelActuator при обработке вх. сигнала. По-умолчанию равна `f(x): x => x` и не влияет на показания, но может быть переопределена пользователем;

</div>

### Методы
<div style = "color: #555">

- <mark style="background-color: lightblue">SetFunc(_func)</mark> - устанавливает трансформационную функцию для вх. сигнала актуатора. Вызов данного метода без передачи в него аргумента, установит функцию по-умолчанию;
- <mark style="background-color: lightblue">SetLinearFunc(_k, _b)</mark> - устанавливает линейную функцию с коэффициентами k и b;
- <mark style="background-color: lightblue">TransformValue(val)</mark> - возвращает значение, прошедшее через трансформирующую функцию.

<div align='left'>
    <img src="./res/math.png" alt="Image not found">
</div>
</div>

# ClassSuppression

### Описание
<div style = "color: #555">

Сервисный класс из стека [ModuleActuator](README.md). Предназначен для обеспечении математической обработки вх. сигнала актуатора и позволяет настроить ограничение (супрессию) входных значений.

Объект класса автоматически инициализируется в поле *_Suppression* класса [ClassChannelActuator](./README_CHANNEL.md). Методы для преобразования данных вызываются автоматически при обращении к исполнительному каналу.

</div>

### Поля
<div style = "color: #555">

- <mark style="background-color: lightblue">_Low</mark> - число, нижняя граница. По-умолчанию **-Infinity**;
- <mark style="background-color: lightblue">_High</mark> - число, верхняя граница. По-умолчанию **Infinity**;

</div>

### Методы
<div style = "color: #555">

- <mark style="background-color: lightblue">SetLim(_limLow, _limHigh)</mark> - устанавливает значения ограничителей входных значений;
- <mark style="background-color: lightblue">SuppressValue(val)</mark> - возвращает число, прошедшее через супрессорную функцию;

</div>

</div>