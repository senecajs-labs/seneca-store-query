'use strict'

var _ = require('lodash')
var actionRole = 'sql'
var name = 'store-query'

module.exports = function queryBuilder (options) {
  var seneca = this
  var QueryBuilder = require('./lib/query-builder')(seneca, options)

  function specificTypes (storeName) {
    var sTypes = {
      escape: '"',
      prepared: '$'
    }
    sTypes.name = storeName

    if (storeName === 'mysql-store') {
      sTypes.escape = '`'
      sTypes.prepared = '?'
    }

    return sTypes
  }

  seneca.add({role: actionRole, hook: 'load'}, function (args, done) {
    var qent = args.qent
    var sTypes = specificTypes(args.target)
    var q = _.clone(args.q)
    q.limit$ = 1

    QueryBuilder.selectstm(qent, q, sTypes, function (err, query) {
      return done(err, {query: query})
    })
  })

  seneca.add({role: actionRole, hook: 'list'}, function (args, done) {
    var q = args.q
    var qent = args.qent
    var sTypes = specificTypes(args.target)

    QueryBuilder.buildSelectStatement(qent, q, sTypes, function (err, query) {
      return done(err, {query: query})
    })
  })

  return {
    name: name
  }
}
