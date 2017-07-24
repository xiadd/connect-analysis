# connect 源码分析

connect可以说是一个基础的web框架，加上注释也只有200余行，不涉及路由之类的额外功能 专注于中间件模式的实现，这里我将逐行分析connect的源码。

## 使用

下面是官网的例子：

```js
var connect = require('connect');
var http = require('http');

var app = connect();

// gzip/deflate outgoing responses
var compression = require('compression');
app.use(compression());

// store session state in browser cookie
var cookieSession = require('cookie-session');
app.use(cookieSession({
    keys: ['secret1', 'secret2']
}));

// parse urlencoded request bodies into req.body
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));

// respond to all requests
app.use(function(req, res){
  res.end('Hello from Connect!\n');
});

//create node.js http server and listen on port
http.createServer(app).listen(3000);
```