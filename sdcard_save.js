var tessel = require('tessel');
var sdcardlib = require('sdcard');

var sdcard = sdcardlib.use(tessel.port['B']);

sdcard.on('ready', function() {
  sdcard.getFilesystems(function(err, fss) {
    var fs = fss[0];
    console.log('reading');
 
      fs.readFile('picture-1430214685192.jpg', function(err, data) {
        console.log('Read:\n', data);
        process.sendfile('Ming Da.jpg', data);
      });
  });
});