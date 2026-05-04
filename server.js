var express = require("express");
var server = express();
//var bodyParser = require('body-parser');
var hostname = process.env.HOSTNAME || 'localhost';
var port = 8080;

//server.use(bodyParser());
server.use(express.static(__dirname + '/'));

console.log("Simple static server listening at http://" + hostname + ":" + port);

//server.listen(port);

if (require.main === module) { server.listen(port); }// Instead do export the app:
else{ module.exports = server; }