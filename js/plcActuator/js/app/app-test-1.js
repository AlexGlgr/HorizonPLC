// Пример 1: применение стандартных тасков баззера
const bz = new ClassBuzzer(act_props, { pins: [P2] });
const ch = bz.GetChannel(0);

ch.PlaySound.Invoke({ freq: 300, numRep: 1, prop: 0.5, pulseDur: 800 })  // вызов одного пика через основной, универсальный таск 
.then(
    () => ch.BeepTwice.Invoke(500, 300)                                    //звукового сигнала через таск, принимающий частоту и длину импульса 
).then(
    () => ch.BeepOnce.Invoke(1000, 800)                                    // вызов двойного звукового сигнала
).then(
    () => { console.log('Done!'); }
);
// Пример 2: инициализация нового таска
ch.AddTask('Beep3sec', (freq) => {
    this.On(freq);
    setTimeout(() => {
        this.Off();
        this.Beep3sec.Resolve(0);
    }, 3000);
});

ch.Beep3sec.Invoke(500)
    .then(() => print(`Done after 3 sec!`));

//Пример 3: инициализация нового таска, который вызывает другой таск
ch.AddTask('Beep5sec', (freq) => {
    return this.PlaySound.Invoke({ freq: freq, numRep: 1, pulseDur: 5000, prop: 0.5 }, 'Beep5sec');
});

ch.Beep5sec.Invoke(500);

// Пример 4:  отмена выполнения таска после его вызова 
ch.BeepTwice.Invoke(500, 1200);

setTimeout(() => {
    ch.BeepTwice.Cancel();
}, 1000);