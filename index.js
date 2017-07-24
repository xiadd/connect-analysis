var debug = require('debug')
var EventEmitter = require('events').EventEmitter
var finalhandler = require('finalhandler')
var http = require('http')
var merge = require('util-merge')
var parseUrl = require('parseurl')


module.exports = createServer

var env = process.env.NODE_ENV || 'development'

var proto = {}

var defer = typeof setImmediate === 'function'
  ? setImmediate
  : function (fn) {
    process.nextTick(fn.bind.apply(fn, arguments))
  }

function createServer () {
  var app = function (req, res, next) {
    app.handle(req, res, next)
  }
  merge(app, proto)
  merge(app, EventEmitter.prototype)
  app.route = '/'
  app.stack = []
  return app
}

proto.use = function use (route, fn) {
  var handle = fn
  var path = route

  // 兼容路由和直接挂载中间件
  if (typeof route !== 'string') {
    handle = route
    path = '/'
  }

  // subapp 挂载
  if (typeof handle.handle === 'function') {
    var server = handle
    server.route = path
    handle = function (req, res, next) {
      server.handle(req, res, next)
    }
  }

  if (handle instanceof http.Server) {
    handle = handle.listeners('request')[0]
  }

  // 将路由最后的 ‘/’删除
  if (path[path.length - 1] === '/') {
    path = path.slice(0, -1)
  }

  debug('use %s %s', path || '/', handle.name || 'anonymous')
  this.stack.push({
    route: path,
    handle: handle
  })

  // 链式调用
  return this
}

proto.handle = function handle (req, res, out) {
  var index = 0
  var protohost = getProtohost(req.url) || ''
  var removed = ''
  var slashAdded = false
  var stack = this.stack

  var done = out || finalhandler(req, res, {
    env: env,
    onerror: logerror
  })

  req.originUrl = req.originUrl || req.url
  function next (err) {
    if (slashAdded) {
      req.url = req.url.substr(1)
      slashAdded = false
    }

    if (removed.length !== 0) {
      req.url = protohost + removed + req.url.substr(protohost.length)
      removed = ''
    }

    var layer = stack[index++]

    // 未找到中间件
    if (!layer) {
      defer(done, err)
      return
    }

    var path = parseUrl(req).pathname || '/'
    var route = layer.route
    // 迭代
    if (path.toLowerCase().substr(0, route.length) !== route.toLowerCase()) {
      return next(err)
    }

    // 判断最后一位是否符合connect的要求 如果是. / or undefined则继续下面的操作
    var c = path[route.length]
    if (c !== undefined && '/' !== c && '.' !== c) {
      return next(err)
    }

    if (route.length !== 0 && route !== '/') {
      reqmoved = route
      req.url = protohost + req.url.substr(protohost.length + removed.length)
      if (!protohost && req.url[0] !== '/') {
        req.url = '/' + req.url
        slashAdded = true
      }
    }
    call(layer.handle, route, err, req, res, next)
  }

  next()
}


proto.listen = function listen () {
  var server = http.createServer(this)
  return server.listen.apply(server, arguments)
}

function call (handle, route, err, req, res, next) {
  var arity = handle.length
  var error = err
  var hasError = Boolean(err)

  debug('%s %s : %s', handle.name || '<anonymous>', route, req.originalUrl);
  try {
    if (hasError && arity === 4) {
      // error-handling middleware
      handle(err, req, res, next);
      return;
    } else if (!hasError && arity < 4) {
      // request-handling middleware
      handle(req, res, next);
      return;
    }
  } catch (e) {
    // replace the error
    error = e;
  }

  // continue
  next(error);
}

function logerror(err) {
  if (env !== 'test') console.error(err.stack || err.toString());
}

function getProtohost(url) {
  if (url.length === 0 || url[0] === '/') {
    return undefined;
  }

  var searchIndex = url.indexOf('?');
  var pathLength = searchIndex !== -1
    ? searchIndex
    : url.length;
  var fqdnIndex = url.substr(0, pathLength).indexOf('://');

  return fqdnIndex !== -1
    ? url.substr(0, url.indexOf('/', 3 + fqdnIndex))
    : undefined;
}