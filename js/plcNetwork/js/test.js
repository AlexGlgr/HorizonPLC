function test () {
    setInterval(() => {
        console.log('Test');
        //Send(0, 'Test message Graylog', 2);
        //Send(1, 'Test message MQTT', 0);
    }, 5000);
};

test();