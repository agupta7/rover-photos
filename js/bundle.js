// "require" all the CSS files that have <link> tags in the HTML page
// any nested @imports will automatically be included
// require("../css/reset.css");
// require("../css/global.css");
require("bootstrap/dist/css/bootstrap.css")

// here we "require" all the scripts that have tags in the spa.html page
var app = require("./spa.js");
