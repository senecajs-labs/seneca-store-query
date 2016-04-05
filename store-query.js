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
    var qent = args.qent
    var q = args.q
    var sTypes = specificTypes(args.target)

    buildSelectStatement(q, sTypes, function (err, query) {
      return done(err, {query: query})
    })

    function buildSelectStatement (q, sTypes, done) {
      var query

      if (_.isString(q)) {
        return done(null, q)
      }
      else if (_.isArray(q)) {
        // first element in array should be query, the other being values
        if (q.length === 0) {
          var errorDetails = {
            message: 'Invalid query',
            query: q
          }
          seneca.log.error('Invalid query')
          return done(errorDetails)
        }
        query = {}
        query.text = QueryBuilder.fixPrepStatement(q[0], sTypes)
        query.values = _.clone(q)
        query.values.splice(0, 1)
        return done(null, query)
      }
      else {
        if (q.ids) {
          return done(null, QueryBuilder.selectstmOr(qent, q, sTypes))
        }
        else {
          QueryBuilder.selectstm(qent, q, sTypes, done)
        }
      }
    }
  })

  return {
    name: name
  }
}
