// Для наглядности "посадим" на порты А0 и Р12 светодиоды 
let a_ports = H.DeviceManager.Service.CreateDevice('21');

// Явное задание режима порта
a_ports[0].Configure({ mode: 'af_output' });
a_ports[1].Configure({ mode: 'output' });

// Подадим аналоговый сигнал на А0
a_ports[0].On(0.5, { freq: 50 });  
// Подадим цифровой сигнал на P12
a_ports[1].On(1); 