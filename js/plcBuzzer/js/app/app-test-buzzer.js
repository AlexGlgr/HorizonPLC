const bz = H.DeviceManager.Service.CreateDevice('bz')[0];
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