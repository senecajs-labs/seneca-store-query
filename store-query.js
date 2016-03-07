'use strict'

var _ = require('lodash')
var QueryBuilder = require('./lib/query-builder')

var actionRole = 'sql'

module.exports = function queryBuilder (options) {
  var seneca = this

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

  seneca.add({role: actionRole, hook: 'save'}, function (args, done) {
    var ent = args.ent
    var update = !!ent.id
    var query
    var autoIncrement = args.auto_increment || false
    var sTypes = specificTypes(args.target)

    if (update) {
      query = QueryBuilder.updatestm(ent, sTypes)
      return done(null, {query: query, operation: 'update'})
    }

    if (ent.id$) {
      ent.id = ent.id$
      query = QueryBuilder.savestm(ent, sTypes)
      return done(null, {query: query, operation: 'save'})
    }

    if (autoIncrement) {
      query = QueryBuilder.savestm(ent, sTypes)
      return done(null, {query: query, operation: 'save'})
    }

    seneca.act({role: actionRole, hook: 'generate_id', target: args.target}, function (err, result) {
      if (err) {
        seneca.log.error('hook generate_id failed')
        return done(err)
      }
      ent.id = result.id
      query = QueryBuilder.savestm(ent, sTypes)
      return done(null, {query: query, operation: 'save'})
    })
  })

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

  seneca.add({role: actionRole, hook: 'remove'}, function (args, done) {
    var qent = args.qent
    var q = args.q
    var sTypes = specificTypes(args.target)

    var query = QueryBuilder.deletestm(qent, q, sTypes)
    return done(null, {query: query})
  })
}
