'use strict'

var RelationalStore = require('./relational-util')
var _ = require('lodash')
var OpParser = require('./operator_parser')
var StandardQuery = require('seneca-standard-query')

var buildQueryFromExpression = function (entp, query_parameters, sTypes, values) {
  var params = []
  values = values || []

  if (!_.isEmpty(query_parameters) && query_parameters.params.length > 0) {
    for (var i in query_parameters.params) {
      var current_name = query_parameters.params[i]
      var current_value = query_parameters.values[i]

      var result = parseExpression(current_name, current_value)
      if (result.err) {
        return result
      }
    }

    return {err: null, data: params.join(' AND '), values: values}
  }
  else {
    return {values: values}
  }

  function parseOr (current_name, current_value) {
    if (!_.isArray(current_value)) {
      return {err: 'or$ operator requires an array value'}
    }

    var results = []
    for (var i in current_value) {
      var w = whereargs(entp, current_value[i])
      var current_result = buildQueryFromExpression(entp, w, sTypes, values)
      values = current_result.values
      results.push(current_result)
    }

    var resultStr = ''
    for (i in results) {
      if (resultStr.length > 0) {
        resultStr += ' OR '
      }
      resultStr += results[i].data
    }
    params.push('(' + resultStr + ')')
  }

  function parseAnd (current_name, current_value) {
    if (!_.isArray(current_value)) {
      return {err: 'and$ operator requires an array value'}
    }

    var results = []
    for (var i in current_value) {
      var w = whereargs(entp, current_value[i])
      var current_result = buildQueryFromExpression(entp, w, sTypes, values)
      values = current_result.values
      results.push(current_result)
    }

    var resultStr = ''
    for (i in results) {
      if (resultStr.length > 0) {
        resultStr += ' AND '
      }
      resultStr += results[i].data
    }
    params.push('(' + resultStr + ')')
  }

  function parseExpression (current_name, current_value) {
    if (current_name === 'or$') {
      parseOr(current_name, current_value)
    }
    else if (current_name === 'and$') {
      parseAnd(current_name, current_value)
    }
    else {
      if (current_name.indexOf('$') !== -1) {
        return {}
      }

      if (current_value === null) {
        // we can't use the equality on null because NULL != NULL
        params.push(sTypes.escape + RelationalStore.escapeStr(RelationalStore.camelToSnakeCase(current_name)) + sTypes.escape + ' IS NULL')
      }
      else if (current_value instanceof RegExp) {
        var op = (current_value.ignoreCase) ? '~*' : '~'
        values.push(current_value.source)
        params.push(sTypes.escape + RelationalStore.escapeStr(RelationalStore.camelToSnakeCase(current_name)) + sTypes.escape + op + RelationalStore.preparedStatements(sTypes.name, values.length))
      }
      else if (_.isObject(current_value)) {
        var result = parseComplexSelectOperator(current_name, current_value, params)
        if (result.err) {
          return result
        }
      }
      else {
        values.push(current_value)
        params.push(sTypes.escape + RelationalStore.escapeStr(RelationalStore.camelToSnakeCase(current_name)) + sTypes.escape + '=' + RelationalStore.preparedStatements(sTypes.name, values.length))
      }
    }
    return {}
  }

  function parseComplexSelectOperator (current_name, current_value, params) {
    for (var op in current_value) {
      var op_val = current_value[op]
      if (!OpParser[op]) {
        return {err: 'This operator is not yet implemented: ' + op}
      }
      var err = OpParser[op](current_name, op_val, params, values, sTypes)
      if (err) {
        return {err: err}
      }
    }
    return {}
  }
}

function whereargs (entp, q) {
  return StandardQuery.whereargs(entp, q)
}


function fixPrepStatement (stm, sTypes) {
  return StandardQuery.fixPrepStatement(stm, sTypes)
}

function jsonSupport (sTypes) {
  return StandardQuery.jsonSupport(sTypes)
}

function selectstm (qent, q, sTypes, done) {
  var specialOps = ['fields$']
  var specialOpsVal = {}

  var stm = {}

  for (var i in specialOps) {
    if (q[specialOps[i]]) {
      specialOpsVal[specialOps[i]] = q[specialOps[i]]
      delete q[specialOps[i]]
    }
  }

  var table = RelationalStore.tablename(qent)
  var entp = RelationalStore.makeentp(qent, jsonSupport(sTypes))


  var w = whereargs(entp, q)

  var response = buildQueryFromExpression(entp, w, sTypes)
  if (response.err) {
    return done(response.err)
  }

  var wherestr = response.data

  var values = response.values

  var mq = metaquery(qent, q)

  var metastr = ' ' + mq.params.join(' ')

  var what = '*'
  if (specialOpsVal['fields$'] && _.isArray(specialOpsVal['fields$']) && specialOpsVal['fields$'].length > 0) {
    what = ' ' + specialOpsVal['fields$'].join(', ')
    what += ', id '
  }

  stm.text = 'SELECT ' + what + ' FROM ' + RelationalStore.escapeStr(table) + (wherestr ? ' WHERE ' + wherestr : '') + RelationalStore.escapeStr(metastr)
  stm.values = values

  done(null, stm)
}

function selectstmOr (qent, q, sTypes) {
  return StandardQuery.selectstmOr(qent, q, sTypes)
}

function metaquery (qent, q) {
  return StandardQuery.metaquery(qent, q)
}

module.exports.buildQueryFromExpression = buildQueryFromExpression
module.exports.selectstm = selectstm
module.exports.fixPrepStatement = fixPrepStatement
module.exports.selectstmOr = selectstmOr
