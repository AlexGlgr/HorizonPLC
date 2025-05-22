let s_ports = H.DeviceManager.Service.CreateDevice('20');

// Явное задание режима порта
s_ports[0].Configure({mode: 'analog'});
s_ports[0].Start(20);   
// С флагом force будет проигнорирована проверка режима работы порта и он установится автоматически    
s_ports[1].Start(20, { force: true });

let interval = setInterval(() => {
    s_ports.forEach(port => {
        let info = port.GetInfo();
        console.log(`${info.port+info.num}: ${(port.Value).toFixed(3)}`);
    });

}, 2500);