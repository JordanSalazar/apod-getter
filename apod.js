"use strict";

var fs = require('fs-extra');
var child = require('child_process');
var cheerio = require('cheerio');
var fetch = require('node-fetch');
var http = require('http');
var Q = require('q');
var R = require('ramda');


var host = 'apod.nasa.gov';
var path = '/apod/';


var logError = R.pipe(R.prop('message'), console.error.bind(console));
var logFile = fs.openSync('logs/apod.log', 'a+');


console.log('Getting image from: ' + host + path);

var getHtmlPromise = fetch('http://' + host + path);

getHtmlPromise.then(function (resp) {
    return resp.text();
}).then(function (body) {
    return getImagePromise(body);
}).then(function (result) {
    console.log(result);
    writePlist();
}).catch(function (err) {
    logError(err);
});

var getImagePromise = function (data) {
    return new Promise(function (resolve, reject) {

        var parsedHTML = cheerio.load(data.toString());
        var image_url = path + parsedHTML('img').attr('src'); 

        var getImage = http.get({
            host: host,
            path: image_url
          }, function (res) {

              var filepath = __dirname + '/images/' + Math.floor(Date.now() / 1000) + '.' + image_url.split('.')[1];
              var write_stream = fs.createOutputStream(filepath);

              res.pipe(write_stream);

              res.on("end", function () {
                  var set_background = "osascript -e 'tell application \"Finder\" to set desktop picture to POSIX file \"" + filepath + "\"'";

                  if (!fs.existsSync(filepath)) {
                    reject('Error: ' + filepath + ' wasn\'t saved correctly');
                    return;
                  }

                  console.log('Wrote to file: ' + filepath);

                  child.exec(set_background, function (err, stdout, stderr){
                    if (err) return reject('Error: ' + err);

                    if (stderr) return reject('Error: ' + stderr);

                    resolve('Success!');
                  });

              });

              res.on("error", reject);
        });

        getImage.on("error", reject);

    });

};

var writePlist = function () {
    var home_dir = process.env.HOME;
    var filepath = home_dir + "/Library/LaunchAgents/apod.sleepwatcher.plist";

    if (fs.existsSync(filepath)) {
        return;
    }

    var plist = "<?xml version='1.0' encoding='UTF-8'?>\n\
                 <!DOCTYPE plist PUBLIC '-//Apple Computer//DTD PLIST 1.0//EN' 'http://www.apple.com/DTDs/PropertyList-1.0.dtd'>\n\
                <plist version='1.0'>\n\
                    <dict>\n\
                        <key>Label</key>\n\
                        <string>apod.sleepwatcher</string>\n\
                        <key>ProgramArguments</key>\n\
                        <array>\n\
                            <string>" + __dirname + "/sleepwatcher_2.2/sleepwatcher</string>\n\
                            <string>-V</string>\n\
                            <string>-w " + __dirname + "/apod.nex </string>\n\
                        </array>\n\
                        <key>RunAtLoad</key>\n\
                        <true/>\n\
                        <key>KeepAlive</key>\n\
                        <true/>\n\
                    </dict>\n\
                </plist>\n";

    fs.outputFile(filepath, plist, function (err) {
        if (err) return logError(err);

        child.exec('launchctl load -w ' + filepath, function (err, stdout, stderr) {

            if (err) return logError(err);
            if (stderr) return logError(stderr);

            console.log('Loaded startup plist in: ' + filepath);
        });

    });

};

