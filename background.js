var fs = require('fs');
var child = require('child_process');
var request = require('request');
var cheerio = require('cheerio');


var domain = 'http://apod.nasa.gov/apod/';


var callback = function (err, resp, data) {

  if (err) return console.error(err);

  var parsedHTML = cheerio.load(data.toString());
  var image_url = domain + parsedHTML('img').attr('src');


  request.get({url: image_url, encoding: 'binary'}, function (err, resp, data) {

    if (err) return console.error(err);


    var filepath = __dirname + '/images/' + Math.floor(Date.now() / 1000) + image_url.slice(-4);

    console.log('Writing to: ' + filepath);


    fs.writeFileSync(filepath, data, 'binary', function (err) {
        if (err) return console.error(err);
    });


    var set_background = "osascript -e 'tell application \"Finder\" to set desktop picture to POSIX file \"" + filepath + "\"'";

    if (!fs.existsSync(filepath)) {
      return console.error('image doesn\'t exist!');
    }

    child.exec(set_background, function (err, stdout, stderr){

        if (err) return console.error(err);
        
        console.log('Success!');

    });

  });


};

console.log('Getting image from: ' + domain);

request(domain, callback);