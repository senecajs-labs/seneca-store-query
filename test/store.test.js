'use strict'

var Seneca = require('seneca')
var Shared = require('seneca-store-test')

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var before = lab.before
var describe = lab.describe

var DBConfig = require('./dbconfig')

var si = Seneca({
  default_plugins: {
    'mem-store': false
  }
})

describe('seneca-store-query tests ', function () {
  before({}, function (done) {
    si.use(require('seneca-postgres-store'), DBConfig)
    si.ready(function () {
      si.use(require('seneca-store-query'))
      si.ready(done)
    })
  })

  Shared.basictest({
    seneca: si,
    script: lab
  })

  Shared.sorttest({
    seneca: si,
    script: lab
  })

  Shared.limitstest({
    seneca: si,
    script: lab
  })

  Shared.sqltest({
    seneca: si,
    script: lab
  })
})
