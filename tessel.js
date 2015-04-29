var tessel = require('tessel');

//ambient
var ambientlib = require('ambient-attx4');
var ambient = ambientlib.use(tessel.port['C']);

//climate
var climatelib = require('climate-si7020');
var climate = climatelib.use(tessel.port['D']);

var wifi = require('wifi-cc3000');
var http = require('http');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var network = 'iphone-tesselwu';
var pass = '12345677';
var security = 'wpa2';
var timeouts = 20;
var led1 = tessel.led[0].output(1);
var led2 = tessel.led[1].output(1);


function connect() {
    wifi.connect({
        security: security,
        ssid: network,
        password: pass,
        timeout: 10 // in seconds
    });
}

wifi.on('connect', function(data) {
    console.log("connect emitted", data);
    setInterval(function() {
        // Toggle the led states
        led1.toggle();
        led2.toggle();
    }, 1000);


    climate.on('ready', function() {
        console.log('Connected to si7005');
        ambient.on('ready', function() {

            var feed = {
                init: function() {
                    setInterval(function() {
                        feed.ready ? feed.action() : 0;
                    }, 1500);
                },
                ready: true,
                postData: function(data) {
                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', 'https://t9-dataserver.herokuapp.com/feed');

                    xhr.onreadystatechange = function(oEvent) {
                        if (xhr.readyState == 4) {
                            if (xhr.statis == 200) {
                                console.log('Got response: ' + xhr.responseText);
                                feed.ready = true;
                            } else {
                                console.error("Error: ", xhr.statusText);
                                console.log("Retry late..");
                                feed.ready = true;
                            }
                        }
                    };
                    xhr.send(data);
                },
                action: function() {
                    console.log("hehe");
                    //get ambient data
                    ambient.getLightLevel(function(err, ldata) {
                        if (err) throw err;
                        ambient.getSoundLevel(function(err, sdata) {
                            if (err) throw err;
                            console.log("Light level:", ldata.toFixed(8), " ", "Sound Level:", sdata.toFixed(8));
                            climate.readTemperature('f', function(err, temp) {
                                climate.readHumidity(function(err, humid) {
                                    temp = (temp - 32) * (5 / 9);
                                    console.log('Degrees:', temp.toFixed(4) + 'C', 'Humidity:', humid.toFixed(4) + '%RH');
                                    ldata = ldata.toFixed(8);
                                    sdata = sdata.toFixed(8);
                                    temp = temp.toFixed(4);
                                    humid = humid.toFixed(4);

                                    var packet = {
                                        light: ldata,
                                        noise: sdata,
                                        temparature: temp,
                                        humidity: humid,
                                        date: new Date()
                                    }
                                    feed.postData(JSON.stringify(packet));
                                });
                            });
                        });
                    });

                    feed.ready = false;
                }
            };
            feed.init();
        });
        ambient.on('error', function(err) {
            console.log(err)
        });

    });

    climate.on('error', function(err) {
        console.log('error connecting module', err);
    });

});



wifi.on('disconnect', function(data) {
    // wifi dropped, probably want to call connect() again
    console.log("disconnect emitted", data);
})

wifi.on('timeout', function(err) {
    // tried to connect but couldn't, retry
    console.log("timeout emitted");
    timeouts++;
    if (timeouts > 2) {
        // reset the wifi chip if we've timed out too many times
        powerCycle();
    } else {
        // try to reconnect
        connect();
    }
});

wifi.on('error', function(err) {
    // one of the following happened
    // 1. tried to disconnect while not connected
    // 2. tried to disconnect while in the middle of trying to connect
    // 3. tried to initialize a connection without first waiting for a timeout or a disconnect
    console.log("error emitted", err);
});

// reset the wifi chip progammatically
function powerCycle() {
    // when the wifi chip resets, it will automatically try to reconnect
    // to the last saved network
    wifi.reset(function() {
        timeouts = 0; // reset timeouts
        console.log("done power cycling");
        // give it some time to auto reconnect
        setTimeout(function() {
            if (!wifi.isConnected()) {
                // try to reconnect
                connect();
            }
        }, 60 * 1000); // 20 second wait
    })
}
