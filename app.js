var connect = require('./index.js')
var app = connect()


app.use('/test', function (req, res) {
  console.log(res.header)
  res.end('xiadd')
})

app.listen(8080, function () {
  console.log('server is running on port 8080')
})
