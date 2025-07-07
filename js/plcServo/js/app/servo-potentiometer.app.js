let pot = H.DeviceManager.Service.CreateDevice('pot')[0].Start();

let servo = H.DeviceManager.Service.CreateDevice('servo')[0];

let interval = setInterval(() => {
    servo.SetValue((pot.Value).toFixed(1));
}, 20);
