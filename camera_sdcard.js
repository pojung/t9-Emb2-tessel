require('tesselate') ({
  modules: {
    B: ['sdcard', 'sdcard'],
    A: ['camera-vc0706', 'camera']
  }
}, function (tessel, modules) {

    var sdcard = modules.sdcard,
        camera = modules.camera;

    var sdFileSys,
        times = [];

    function takePic(){

        var name, t1, t2;

        camera.takePicture(function(err, image) {

            name = 'picture-' + Date.now() + '.jpg';
            console.log('Picture saving as', name, '...');
            process.sendfile(name, image);
            console.log('done.');
            t1 = new Date().getTime();

            sdFileSys.writeFile(name, image, function(err) {

                t2 = new Date().getTime();
                times.push(t2 - t1);
                console.log(times);

            });
        camera.disable();
        });
    }

    sdcard.getFilesystems(function(err, fss) {

        sdFileSys = fss[0];
        takePic();
    });
});