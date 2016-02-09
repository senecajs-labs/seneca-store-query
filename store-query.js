'use strict'

var _ = require('lodash')
var Uuid = require('node-uuid')
var RelationalStore = require('./lib/relational-util')
var QueryBuilder = require('./lib/query-builder')

module.exports = function queryBuilder (options) {
  var seneca = this
  var storeName = 'postgresql-store'

  seneca.add({role: storeName, hook: 'save'}, function (args, done) {
    var ent = args.ent
    var query
    var update = !!ent.id

    if (update) {
      query = QueryBuilder.updatestm(ent)
    }
    else {
      ent.id = ent.id$ || Uuid()
      query = QueryBuilder.savestm(ent)
    }

    return done(null, {query: query, operation: update ? 'update' : 'save'})
  })

  seneca.add({role: storeName, hook: 'load'}, function (args, done) {
    var qent = args.qent
    var q = args.q

    QueryBuilder.selectstm(qent, q, function (err, query) {
      return done(err, {query: query})
    })
  })

  seneca.add({role: storeName, hook: 'list'}, function (args, done) {
    var qent = args.qent
    var q = args.q

    var list = []

    buildSelectStatement(q, function (err, query) {
      return done(err, {query: query})
    })

    function buildSelectStatement (q, done) {
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
        query.text = QueryBuilder.fixPrepStatement(q[0])
        query.values = _.clone(q)
        query.values.splice(0, 1)
        return done(null, query)
      }
      else {
        if (q.ids) {
          return done(null, QueryBuilder.selectstmOr(qent, q))
        }
        else {
          QueryBuilder.selectstm(qent, q, done)
        }
      }
    }
  })

  seneca.add({role: storeName, hook: 'remove'}, function (args, done) {
    var qent = args.qent
    var q = args.q

    // if (q.all$) {
      var query = QueryBuilder.deletestm(qent, q)
      return done(null, {query: query})

      // execQuery(query, function (err, res) {
      //   if (!error(query, args, err, done)) {
      //     seneca.log(args.tag$, 'remove', res.rowCount)
      //     return done()
      //   }
      //   else if (err) {
      //     return done(err)
      //   }
      //   else {
      //     err = new Error('no candidate for deletion')
      //     err.critical = false
      //     return done(err)
      //   }
      // })
    // }
    // else {
      // QueryBuilder.selectstm(qent, q, function (err, selectQuery) {
      //   if (err) {
      //     var errorDetails = {
      //       message: err.message,
      //       err: err,
      //       stack: err.stack,
      //       query: query
      //     }
      //     seneca.log.error('Query Failed', JSON.stringify(errorDetails, null, 1))
      //     return done(err)
      //   }

      //   execQuery(selectQuery, function (err, res) {
      //     if (error(selectQuery, args, err, done)) {
      //       var errorDetails = {
      //         message: err.message,
      //         err: err,
      //         stack: err.stack,
      //         query: query
      //       }
      //       seneca.log.error('Query Failed', JSON.stringify(errorDetails, null, 1))
      //       return done(err)
      //     }

      //     var entp = res.rows[0]

      //     if (entp) {
      //       var query = QueryBuilder.deletestm(qent, {id: entp.id})

      //       execQuery(query, function (err, res) {
      //         if (err) {
      //           return done(err)
      //         }

      //         seneca.log(args.tag$, 'remove', res.rowCount)
      //         return done(null)
      //       })
      //     }
      //     else {
      //       return done(null)
      //     }
      //   })
      // })
    // }
  })
}
