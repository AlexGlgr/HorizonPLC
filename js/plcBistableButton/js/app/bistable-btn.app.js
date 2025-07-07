let btn = H.DeviceManager.Service.CreateDevice('18')[0];
btn.Start();

btn.on('enable', () => { print('on'); });
btn.on('disable', () => { print('off'); });
btn.on('changeState', () => { print('changeState'); });