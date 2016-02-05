'use strict'

var _ = require('lodash')
var Uuid = require('node-uuid')
var RelationalStore = require('./lib/relational-util')
var QueryBuilder = require('./lib/query-builder')

module.exports = function user (options) {
  var seneca = this

  seneca.add({role: store.name, hook: 'save'}, function (args, done) {
    var ent = args.ent
    var query
    var update = !!ent.id

    if (update) {
      query = QueryBuilder.updatestm(ent)
      execQuery(query, function (err, res) {
        if (error(query, args, err)) {
          seneca.log.error(query.text, query.values, err)
          return done({code: 'update', tag: args.tag$, store: store.name, query: query, error: err})
        }

        seneca.log(args.tag$, 'update', ent)
        return done(null, ent)
      })
    }
    else {
      ent.id = ent.id$ || Uuid()

      query = QueryBuilder.savestm(ent)

      execQuery(query, function (err, res) {
        if (error(query, args, err)) {
          seneca.log.error(query.text, query.values, err)
          return done({code: 'save', tag: args.tag$, store: store.name, query: query, error: err})
        }

        seneca.log(args.tag$, 'save', ent)
        return done(null, ent)
      })
    }
  })
  seneca.add({role: store.name, hook: 'load'}, function (args, done) {
    var qent = args.qent
    var q = args.q

    QueryBuilder.selectstm(qent, q, function (err, query) {
      if (err) {
        return done({code: 'load', tag: args.tag$, store: store.name, query: query, error: err})
      }

      execQuery(query, function (err, res) {
        if (error(query, args, err)) {
          var trace = new Error()
          seneca.log.error(query.text, query.values, trace.stack)
          return done({code: 'load', tag: args.tag$, store: store.name, query: query, error: err})
        }

        var ent = null
        if (res.rows && res.rows.length > 0) {
          var attrs = internals.transformDBRowToJSObject(res.rows[0])
          ent = RelationalStore.makeent(qent, attrs)
        }
        seneca.log(args.tag$, 'load', ent)
        return done(null, ent)
      })
    })
  })
  seneca.add({role: store.name, hook: 'list'}, function (args, done) {
    var qent = args.qent
    var q = args.q

    var list = []

    buildSelectStatement(q, function (err, query) {
      if (err) {
        seneca.log.error('Postgres list error', err)
        return done({code: 'list', tag: args.tag$, store: store.name, query: q, error: err})
      }

      execQuery(query, function (err, res) {
        if (error(query, args, err, done)) {
          return done({code: 'list', tag: args.tag$, store: store.name, query: query, error: err})
        }

        res.rows.forEach(function (row) {
          var attrs = internals.transformDBRowToJSObject(row)
          var ent = RelationalStore.makeent(qent, attrs)
          list.push(ent)
        })
        seneca.log(args.tag$, 'list', list.length, list[0])
        return done(null, list)
      })
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
  seneca.add({role: store.name, hook: 'remove'}, function (args, done) {
    var qent = args.qent
    var q = args.q

    if (q.all$) {
      var query = QueryBuilder.deletestm(qent, q)

      execQuery(query, function (err, res) {
        if (!error(query, args, err, done)) {
          seneca.log(args.tag$, 'remove', res.rowCount)
          return done()
        }
        else if (err) {
          return done(err)
        }
        else {
          err = new Error('no candidate for deletion')
          err.critical = false
          return done(err)
        }
      })
    }
    else {
      QueryBuilder.selectstm(qent, q, function (err, selectQuery) {
        if (err) {
          var errorDetails = {
            message: err.message,
            err: err,
            stack: err.stack,
            query: query
          }
          seneca.log.error('Query Failed', JSON.stringify(errorDetails, null, 1))
          return done(err)
        }

        execQuery(selectQuery, function (err, res) {
          if (error(selectQuery, args, err, done)) {
            var errorDetails = {
              message: err.message,
              err: err,
              stack: err.stack,
              query: query
            }
            seneca.log.error('Query Failed', JSON.stringify(errorDetails, null, 1))
            return done(err)
          }

          var entp = res.rows[0]

          if (entp) {
            var query = QueryBuilder.deletestm(qent, {id: entp.id})

            execQuery(query, function (err, res) {
              if (err) {
                return done(err)
              }

              seneca.log(args.tag$, 'remove', res.rowCount)
              return done(null)
            })
          }
          else {
            return done(null)
          }
        })
      })
    }
  })
}
