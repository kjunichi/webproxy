/**
 * proxy処理
 **/
var http = require('http');
var https = require('https');
var qs = require("qs");

if (!String.prototype.endsWith) {
    Object.defineProperty(String.prototype, 'endsWith', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (searchString, position) {
            position = position || this.length;
            position = position - searchString.length;
            return this.lastIndexOf(searchString) === position;
        }
    });
}

// バイナリデータの処理
function doBinary(req,res,url,options){
    var bufs = []; // バッファを蓄えておく配列
    bufs.totalLength = 0;
    var myHttp = http;
    if(url.indexOf("https")>-1) {
        myHttp=https;
    }
    var req3 = myHttp.get(options,function(res2){
        res2.on('data', function(chunk) {
            bufs.push(chunk);
            bufs.totalLength += chunk.length;
        });
        res2.on('end', function() {
            //console.log("bufs.totalLength = "+bufs.totalLength );
            res.setHeader('Content-Type', res2.headers['content-type']);
            res.setHeader('Content-Length', bufs.totalLength);
            //res.headers=res2.headers;
            //console.log(res2.headers['content-type']);
            //console.dir(res2.headers);
            
            res.end(Buffer.concat(bufs, bufs.totalLength));
        });
    });
    req3.setTimeout(15000,function() {
        console.log("timeout! url = "+url);
        req3.abort();
    })
    
}

// JavaScript用の書き換え
function rewriteJS(data,target,headers) {
     // JavaScriptの場合
    if(target.path.indexOf(".js")>0) {
        /*
        data = data.replace(/window.document.location.hostname/g,'"'+target.host+'"');
        data = data.replace(/window.document.location.href/g,'"'+target.path+'"');
        
        data = data.replace(/window.location.hostname/g,'"'+target.host+'"');
        data = data.replace(/window.location.href/g,'"'+target.path+'"');
        
        data = data.replace(/document.location.hostname/g,'"'+target.host+'"');
        data = data.replace(/document.location.href/g,'"'+target.path+'"');
        
        data = data.replace(/location.hostname/g,'"'+target.host+'"');
        data = data.replace(/location.href/g,'"'+target.path+'"');
        
        // "host.com" = -> location.hostname = 
        var regex = new RegExp("\"" + target.host + "\" = ","g");
        data = data.replace(regex,"location.hostname = ");
        
        regex = new RegExp("\"" + target.path + "\" = ","g");
        data = data.replace(regex,"location.href = ");
        console.log("js url = "+target.path);
        console.log("js begin");
        console.log(data);
        console.log("js end");
        */
        data=data.replace(/jsdo.it/g,function(str,offset,s){
            console.log("replace jsdo.it!");
            return "slidetest-c9-kjunichi.c9.io";
        })
    }
    return data;
}

// URLの置き換え
function rewriteContents(data,target,headers) {
    // target.path オリジナルのURL
    //console.log(data);

    // 取得したHTML中でhttpまたはhttpsで始まるURLらしき文字列を変換する。
    data = data.replace(/(https?)\:\/\/(.*?)([\/|\"])/g,function(str,p1,p2,p3,offset,s) {
        //console.log(p2);
        if(p2==="ssl\' : \'http:") {
            // Google AnalyticsのJavaScriptなので、変換しない
            return str;
        }else{
            return global.myUrlPrefix+"?x_inside_proto="+p1+"&x_inside_host="+p2+"&x_inside_replace=true&x_inside_path="+p3;
        }
    });

    
    // src="/hoge" -> src="http://host/hoge
    data = data.replace(/src=\"\/(.*?)"/g,function(str,p1,offset,s) {
        if(str.indexOf("data:image")>-1) {
            // Skip Data URI
            return str;
        }
        if(p1.indexOf("/")===0) {
            // src=//host.com/pathな形式の場合
            
            var newHost = p1.replace(/\/(.*?)\/.*/,"$1");
            var newPath = p1.replace(/\/.*?\/(.*)/,"$1");
            return "src=\""+global.myUrlPrefix+"?x_inside_proto="+target.proto+"&x_inside_host="+newHost+"&x_inside_replace=true&x_inside_port="+target.port+"&x_inside_path=/"+newPath+"\"";
            
        }
        return "src=\""+global.myUrlPrefix+"?x_inside_proto="+target.proto+"&x_inside_host="+target.host+"&x_inside_replace=true&x_inside_port="+target.port+"&x_inside_path=/"+p1+"\"";
    });
    
    // href="/hoge" -> href="http://host/hoge
    data = data.replace(/href=\"\/(.*?)"/g, function(str,p1,offset,s) {
        if(str.indexOf("data:image")>-1) {
            // Skip Data URI
            return str;
        }
        
        if(p1.indexOf("/")===0) {
            // href=//host.com/pathな形式の場合
            
            var newHost = p1.replace(/\/(.*?)\/.*/,"$1");
            var newPath = p1.replace(/\/.*?\/(.*)/,"$1");
            return "href=\""+global.myUrlPrefix+"?x_inside_proto="+target.proto+"&x_inside_host="+newHost+"&x_inside_replace=true&x_inside_port="+target.port+"&x_inside_path=/"+newPath+"\"";
            
        }
        
        return "href=\""+global.myUrlPrefix+"?x_inside_proto="+target.proto+"&x_inside_host="+target.host+"&x_inside_replace=true&x_inside_port="+target.port+"&x_inside_path=/"+p1+"\"";
    });

    // CSSの場合
    if(target.path.indexOf(".css")>0) {
        data = data.replace(/url *\((.*?)\)/g,function(str,p1,offset,s) {
            //console.log("@css str = "+str);
            p1=p1.replace(/'(.*)'/,"$1");
            //console.log("@css p1 = "+p1);
            if(p1.indexOf("data:image")>-1) {
                return str;
            }
            return "url("+global.myUrlPrefix+"?x_inside_proto="+target.proto+"&x_inside_host="+target.host+"&x_inside_replace=true&x_inside_port="+target.port+"&x_inside_path=/"+p1+")";
        });    
    }
    
   
    
    // formタグのmethodをgetに変える
    data = data.replace(/<form (.*?)method="(.*?)"(.*?)>/g,"<form $1 method=\"get\"$3><input type=\"hidden\" name=\"x_inside_method\" value=\"post\">");
    
    // formのactionに設定された?以降のCGIパラメータをinputタグに展開する。
    var cnt=0;
    data = data.replace(/<form (.*?)action="(.*?)"(.*?)>/g,function(str,p1,p2,p3,offset,s) {
        //console.log("cnt = " +cnt);
    
        // actionで指定したURLから?以降を取り除く。
        var newAction = p2.replace(/(.*?)\?.*/,"$1");
        
        // ?以降をinputタグ形式にする。
        var queryStr = p2.replace(/.*?\?(.*)/,"$1");
    
        //console.log("action : "+newAction);
        //console.log("other form attr : "+p1+p3);
    
        // input tag
        var params = queryStr.split("&");
        var inputTagHtml="";
    
        for(var i = 0; i < params.length; i++) {
            var p = params[i].split("=");
        
            inputTagHtml=inputTagHtml+'<input type="hidden" name="'+p[0]+'" value="'+p[1]+'">';
        }
        cnt++;
        if(newAction.indexOf("http")<0) {
            // actionの指定がhttp://形式ではない場合
            inputTagHtml=inputTagHtml+'<input type="hidden" name="x_inside_host" value="'+target.host+'">';
            inputTagHtml=inputTagHtml+'<input type="hidden" name="x_inside_proto" value="'+target.proto+'">';
            inputTagHtml=inputTagHtml+'<input type="hidden" name="x_inside_port" value="'+target.port+'">';
            inputTagHtml=inputTagHtml+'<input type="hidden" name="x_inside_path" value="'+newAction+'">';
            newAction=global.myUrlPrefix;
        }
        return '<form action="'+newAction+'" '+p1+p3+">"+inputTagHtml;
    });
    
    return data;
}

exports.proxy = function(req, res){

    var port=80;
    if(req.query.x_inside_port) {
        port=req.query.x_inside_port;
    }
    var proto="http";
    if(req.query.x_inside_proto) {
        proto=req.query.x_inside_proto;
        if(proto === "https") {
            port=443;
        }
    }
    var method="GET";
    if(req.query.x_inside_method) {
        method=req.query.x_inside_method;
    }
    
    var cookie="";
    if(req.query.x_inside_cookie) {
        cookie=req.query.x_inside_cookie;
    }
    
    var path="/";
    if(req.query.x_inside_path) {
        path=req.query.x_inside_path;
    }
    //console.dir({m:method,c:cookie,p:path,pt:proto});
    // now grab the url
    var url = proto +"://"+ req.query.x_inside_host + ":"+port + path;
    
    
    var isReplace = false;
    if(req.query.x_inside_replace) {
        isReplace = req.query.x_inside_replace;
    }
    
    var target = {};
    target.host = req.query.x_inside_host;
    target.proto = proto;
    target.path = path;
    target.port = port;
    var myHttp = http;
    if(port==443||proto==="https") {
        url=url.replace(":443/","/");
        myHttp = https;
    }
    var options = {
        hostname: req.query.x_inside_host,
        port: port,
        path: path,
        method: method,
        cookie:cookie
    };
    if(!isReplace) {
        global.gHost = req.query.x_inside_host;
        //console.log("gHost : "+global.gHost);
    }
    
    if(url.endsWith(".jpg")||url.endsWith(".gif")||url.endsWith(".png")) {
        // バイナリデータとして処理する。
        //console.log("bin data!");
        doBinary(req,res,url,options);
        return;
    }
    /*
    if(url.endsWith(".css")||url.endsWith(".js")) {
        // バイナリデータとして処理する。
        console.log("bin data!");
        doBinary(req,res,url,options);
        
        return;
    }
    */
    // x_insideで始まらないパラメータをurlに追加する
    var hatenaF = false;
    console.log("req.query begin ");
    console.dir(req.query);
    console.log("req.query end ");
    
    for(var param in req.query) {
        if(param.indexOf("x_inside")<0) {
            if(options.path.lastIndexOf('?')==-1){
                //options.path = options.path + "?";
                //url=url+"?";
                hatenaF = true;
            }
            if(typeof req.query[param] == "object") {
                var foo={};
                foo[param] = req.query[param];
                //console.dir(foo)
                var val = qs.stringify(foo);
                //console.log("val = "+val);
                if(hatenaF) {
                    url=url+"?"+val;
                    options.path=options.path+"?"+val;
                    hatenaF = false;
                } else {
                    options.path=options.path+"&"+val;
                    url=url+"&"+val;
                }
            } else {
                //console.log("param = " + param+" val = "+req.query[param]);
                if(hatenaF) {
                    url=url+"?"+param+"="+req.query[param];
                    options.path=options.path+"?"+param+"="+req.query[param];
                    hatenaF=false;
                } else {
                    url=url+"&"+param+"="+req.query[param];
                    options.path=options.path+"&"+param+"="+req.query[param];
                }
            }
        }
    }
    //console.log("options.path = "+options.path);
    console.log("target url is "+url+"["+method+"]");
    
    var data="";
    var bufs = []; // バッファを蓄えておく配列
    bufs.totalLength = 0;

    // ?以降をPOST時のデータとして切出す。
    var queryString = options.path.replace(/(.*)\?(.*)/,"$2");
    console.log("queryString = "+queryString);
    var postData = queryString;
    if(req.xhr) {
        // XmlHttpRequestによる要求の場合、POSTされたデータを転送する。
        console.log("req.xhr = " +req.xhr );
        postData = qs.stringify(req.body);
    }
    bufs.totalLength = 0;
    options.headers={};
    if(req.session.myck) {
        var ck = req.session.myck[req.query.x_inside_host];
        if(ck) {
            // 対象にCookieが設定されている場合は、それをヘッダに含める。
            options.headers.Cookie=ck;
            console.log("send cookie = "+ck);
        }
    } else {
        req.session.myck={};
    }

    if(method.toLowerCase()==="post"){
        // POSTの場合
        //if(req.query) {
            //postData=req.query;
        //}
        options.headers['Content-Type']='application/x-www-form-urlencoded';
        postData=postData.replace(/x_inside_.*?=.*?&/g,"");
        postData=postData.replace(/token\[0\]/g,"token");
        postData=postData.replace(/uid\[0\]/g,"uid");
        console.log("postdata ="+postData);
        options.headers['Content-Length']=postData.length;
        
        
        // Referer
        console.log("orig referrer = "+req.headers.referer);
        //options.headers.Referrer="http://jsdo.it/login/twitter";
        
        // remove query string from path
        options.path=options.path.replace(/(.*)\?.*/,"$1");
        //console.log("options.path = "+options.path);
        
        //console.dir(options);
    }
    var req2 = myHttp.request(options, function(res2) {
        console.log("statusCode: ", res2.statusCode+"("+url+")");
        
        //console.log("headers: ", res2.headers);
    
        res2.on('data', function(chunk) {
                bufs.push(chunk);
                bufs.totalLength += chunk.length;
        });
        res2.on('end', function() {
            res.statusCode= res2.statusCode;
            if(res2.statusCode==302) {
                console.log("remote server headers start");
                console.dir(res2.headers);
                console.log("remote server headers end");
                // Locationヘッダの書き換え
                res2.headers.location=res2.headers.location.replace(/(.*)/,function(str,offset,s){
                    
                    var newLocation = str.replace(/(https?)\:\/\/(.*?)[\/|\"]/g,function(str,p1,p2,offset,s) {
                        return global.myUrlPrefix+"?x_inside_proto="+p1+"&x_inside_host="+p2+"&x_inside_replace=true&x_inside_path=/";
                    });
                    return newLocation;
                });
                if(res2.headers.location.indexOf("/")===0) {
                    // /始まりの場合
                    res2.headers.location = global.myUrlPrefix+"?x_inside_proto="+target.proto+"&x_inside_host="+target.host+"&x_inside_replace=true&x_inside_path="+res2.headers.location;
                    
                }
                console.log("new Location is "+ res2.headers.location);
                res.statusCode= res2.statusCode;
                res.setHeader('Content-Type', res2.headers['content-type']);
                res.setHeader('Content-Length', bufs.totalLength);
                
                res.setHeader('Location', res2.headers.location);
                res.end(Buffer.concat(bufs, bufs.totalLength));
                return;
            }
            // コンテントタイプを確認する。
            if(res2.headers['content-type'].indexOf("text/html")>-1
                ||res2.headers['content-type'].indexOf("css")>-1) {
                    // html,cssの場合
                    console.log("rewrite! " + res2.headers['content-type']);
                    data = Buffer.concat(bufs, bufs.totalLength);
                    // コンテンツの書き換え処理を行う
                    data = rewriteContents(data.toString(),target,res2.headers);
                    
                    console.dir(res2.headers);
                if(res2.headers['set-cookie']){
                    // Cookieの埋め込み
                    res.setHeader('Set-Cookie', res2.headers['set-cookie']);
                    req.session.myck[req.query.x_inside_host]=res2.headers['set-cookie'];
                }
                //console.log("html = " + data);
                
                res.setHeader('Content-Type', res2.headers['content-type']);
                res.setHeader('Content-Length', Buffer.byteLength(data));
                res.setHeader('Location', res2.headers.location);
                
                res.end(data);
            } else if(res2.headers['content-type'].indexOf("javascript")>-1) {
                // JS
                console.log("rewrite! " + res2.headers['content-type']);
                data = Buffer.concat(bufs, bufs.totalLength);
                // コンテンツの書き換え処理を行う
                data = rewriteJS(data.toString(),target,res2.headers);
                res.setHeader('Content-Type', res2.headers['content-type']);
                res.setHeader('Content-Length', Buffer.byteLength(data));
                
                res.statusCode= res2.statusCode;
                res.end(data);
            } else {
                //console.log("no html! ,but " + res2.headers['content-type']);
                // html以外はバイナリ扱いする。
                res.setHeader('Content-Type', res2.headers['content-type']);
                res.setHeader('Content-Length', bufs.totalLength);
                res.statusCode= res2.statusCode;
                res.end(Buffer.concat(bufs, bufs.totalLength));
            }
            
        });
    });
    if(method.toLowerCase()==="post"){
        // POSTの場合
        
        req2.write(postData);
    }
    req2.end();
    req2.setTimeout(15000,function() {
        return function(url) {
            console.log("timeout!!["+url+"]");
            req2.abort();
            res.statusCode="500";
            res.end("time out!");
            };
    });
        
    
    // URL書き換え処理
  //res.render('proxy', { title: 'simple test',remoteContents:'hoge' });
}; 
