<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# plcNetwork
<p align="center">
  <img src="logo.png" width="400" title="hover text">
</p>

-----------------

# Лицензия
////

# Описание
<div style = "color: #555">

Модуль реализует службу сервисных функций для установлении сетевого соединения с использованием чипа [Esp8266](https://github.com/Konkery/ModuleWiFiEsp8266/blob/main/res/0a-esp8266ex_datasheet_en.pdf) и Esp32 по Wifi, а также по Ethernet с использованием чипа W5500 и библиотеки WizNET. В текущей версии модуль поддерживает работу **только в режиме клиента**.  Модуль является неотъемлемой частью фреймворка Horizon Automated. В зависимости от полученных данных в конструкторе определяется с каким модулем будет осуществлено взаимодействие.  Для работы модуля необходим конфигурационный файл с именем network.json, содержащий данные для подключения. Файл должен быть размещён во Flash памяти (в файловой системе). Подключение к сети осуществляется автоматически при инициализации фреймворка, параметры подключения выбираются в файле, что исключает необходимость изменений в коде каждый раз, когда необходимо новое подключение. Служба имеет имя Network в глобальном объекте H. 

Архитектурные решения:
- хранится в глобальном объекте служб H;
- реализует паттерн синглтон;
- работает в режиме клиента.
</div>

### Конструктор
<div style = "color: #555">

Конструктор принимает объект с опциями, содержащий единственное поле - базовый модуль. Это строка для динамического вызова функции require() при использовании чипа Esp8266.
Этот параметр прописывается в файле конфигурации служб services.json:
```json
"Network" : 
{
    "Status" : "stopped",
    "ErrorMsg" : "",
    "Importance" : "Primary",
    "InitOrder" : 80,
    "AdvancedOptions" : {
        "baseModule" : "ESP.min.js"
    },
    "Dependency" : ["plcNetwork.min.js"],
    "Description" : "Network desription"
}
```
</div>

### Поля
<div style = "color: #555">

- <mark style="background-color: lightblue">_Name</mark> - имя класса в строковом виде;
- <mark style="background-color: lightblue">_Core</mark> - объект базового класса, непосредственно работающего с чипом;
- <mark style="background-color: lightblue">_ChipType</mark> - тип чипа, обеспечивающего соединеное по сети;
- <mark style="background-color: lightblue">_Bus</mark> - шина для работы с периферийным чипом;
- <mark style="background-color: lightblue">_Ssid</mark> - ssid сети, к которой осуществляется подключение;
- <mark style="background-color: lightblue">_Scan</mark> - массив объектов сетей, найденных во время сканирования;
- <mark style="background-color: lightblue">_Ip</mark> - ip-адрес сети, к которой осуществляется подключениею;
- <mark style="background-color: lightblue">_BaseModule</mark> - имя базового модуля-библиотеки. Объект указанного класса будет помещён в поле _Core.
</div>

### Методы
<div style = "color: #555">

- <mark style="background-color: lightblue">Init(nc, bus, flag, callback)</mark> - осуществляет соединение с сетью, указанной в конфигурационном файле;
От службы Process функция принимает флаг, определяющий используемый чип, шину, по которой будет подключён чип, и конфигурация из network.json. Выбирается либо
Wifi, либо Ethernet.
Пример файла конфигурационного файла network.json:
```json
{
	"wifi" : {                // Начало конфигурации Wifi
		"useWifi" : 0,          // Флаг использования
		"bus" : {               // Описание используемой шины
			"index" : "Serial3",  // Имя шины
			"baudrate" : 115200
		},
		"scan": 0,              // Номер ТД в массиве, к которой осуществляется подключение (при значении -1 происходит скан и подключение по первому совпадению)
		"accpoints": [          // Массив точек доступа
			{
				"ssid":"ssid1",
				"pass":"password1"
			},
			{
				"ssid":"ssid2",
				"pass":"password2"
			}
		],
		"usestatic": 0,           // Флаг использования статики
		"staticconf": {           // Конфигурация статики
			"ip": "192.168.50.159",
			"gw": "192.168.50.251",
			"nm": "255.255.255.0"
		}
	},
	"eth" : {                 // Начало конфигурации Ethernet
		"useEth" : 0,           // Флаг использования
		"bus" : {               // Описание используемой шины
			"index" : "SPI2",     // Имя шины
			"mosi" : "B15",
			"miso" : "B14",
			"sck" : "B13",
			"cs" : "C8",
			"baudrate" : 3200000
		},
		"usestatic": 0,           // Флаг использования статики
		"staticconf": {           // Конфигурация статики
			"ip": "192.168.51.33",
			"gw": "192.168.51.251",
			"nm": "255.255.255.0"
		}
	}
}
```
Также в обновлённой версии для перенастройки чипа ESP8266 требуется файл netsetup.json, который содржит следующие поля:
```json
{
	"ESP": {
		"restore":0,					// Главный флаг, 1 означает перенастройку чипа при запуске фреймвока, скидывается в 0 автоматически
		"stationMode":1,				// режим работы станции - клиент или источник
		"country": {					// настройки страны
			"index":"RU",				// индекс страны
			"startchannel":1,			// номер первого вещательного канала
			"maxchannels":13			// общее количество вещательных каналов
		},
		"protocol":3,					// версия протокола WiFi (b/g/n)
		"autoConnect":1,				// флаг автоподключения
		"reConnect": {					// настройки переподключения
			"interval":5,				// интервал между попытками в секундах (0 - выключено)
			"retries":0					// количество попыток (0 - бесконечно)
		},
		"accessPoint": {				// характеристики точки доступа, к которой будет осуществлено автоматическое подключение и попытки переподключений
			"ssid":"ssid_name",	
			"pass":"password123"
		}
	}
}
```
- <mark style="background-color: lightblue">WifiSequence(nc, callback)</mark> - метод запуска подключения к сети по Wifi;
- <mark style="background-color: lightblue">EtherSequence(nc, bus, callback)</mark> - метод запуска подключения к сети по Ethernet;
- <mark style="background-color: lightblue">EventsHandling()</mark> - в методе осуществляется подписка к важным событиям, приходящим с контроллера;
- <mark style="background-color: lightblue">Restore(nc, callback)</mark> - метод через цепь промисов выполняет перенастройку чипа esp8266 по конфигурации netsetup.json;
- <mark style="background-color: lightblue">GetAPCreds(nc, callback)</mark> - метод определяет к какой точке доступа осуществить подключение, ориентируясь на конфигурацю;
- <mark style="background-color: lightblue">Connect(pass, callback)</mark> - метод непосредственного подключения к сети по Wifi;
- <mark style="background-color: lightblue">SetStatic(nc, callback)</mark> - метод установки статического IP-адреса при подключении по Wifi;
- <mark style="background-color: lightblue">Status()</mark> - возвращает текущее состояние открытых сокетов;
- <mark style="background-color: lightblue">GetNetPassword(_aps)</mark> - находит в конфигурации пароль, соответствующей выбранной точке доступа.
</div>

### Примеры
<div style = "color: #555; font-size: 16px">

Служба запускается автоматически при инициализации фреймворка. Пользователю предоставляется использование методов служюы, но необходимости в повторном запуске нет.
Вывод созданнного объекта в консоль:
<p align="left">
  <img src="./res/output.png" title="hover text">
</p>
</div>

# Зависимости
- [ClassBaseUARTBus](https://github.com/Konkery/ModuleBaseUARTbus/blob/main/README.md)
- [ModuleAppError](https://github.com/Konkery/ModuleAppError/blob/main/README.md)
- [ModuleAppMath](https://github.com/Konkery/ModuleAppMath/blob/main/README.md)
</div>
