
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , proxy = require("./routes/proxy")
  , http = require('http')
  , qs = require("qs")
  , path = require('path');

global.myUrlPrefix="https://slidetest-c9-kjunichi.c9.io/proxy";


var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/proxy', proxy.proxy);

app.use(function (req,res,next) {
    //console.dir(req);
    console.log("redirect from "+req.url);
    var origUrl = req.url;
    //console.log("Referer = " + req.headers['referer']);
    // リファラーがある場合、そこのx_inside_hostの値をhostに設定する。
    var newHost;
    if(req.headers.referer) {
        newHost = req.headers.referer.replace(/.*_inside_host=(.*?)&.*/,"$1");
        //console.log("newHost = "+newHost);
        //req.body
    }
    //res.redirect(
    //    global.myUrlPrefix+"?x_inside_host="+newHost
    //    +"&x_inside_replace=true&x_inside_path="+req.url
    //    );
    req.query.x_inside_path=req.url;
    req.url=global.myUrlPrefix;
    req.query.x_inside_host=newHost;
    
    if(req.method==="POST") {
        req.query.x_inside_method="post";
        console.dir(req.body);
        if(req.query.x_inside_path.indexOf("/proxy")) {
            //console.log(req.query.x_inside_path)
            //req.query.x_inside_path=req.headers.referer.replace(/.*_inside_path=(.*?)&.*/,"$1");
            //req.query.x_inside_path="/kjunichi/tfN2/edit";
        }
        // POSTパラメータをquerystring形式に変換。
        req.url=req.url+"?"+qs.stringify(req.body);
        console.log("converted url = "+req.url);
    }
    if(req.xhr) {
        // XmlHttpRequestの場合、オリジナルのパスを優先する。
        req.query.x_inside_path=origUrl;
        
        // req.urlからreq.queryを構築する。
        for(var item in req.body) {
            console.dir(item);
        }
        if(req.query.x_inside_path==="/proxy" && req.query.x_inside_host==="jsdo.it") {

            req.query.x_inside_path ="/api/code/save";
        }
    }
    
    proxy.proxy(req, res, next);
    
        //res.send("OK");
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

// 例外が発生してもサービスを停止しないようにする
process.on('uncaughtException', function(err) {
console.log(err.stack);
});
