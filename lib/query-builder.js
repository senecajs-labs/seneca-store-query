'use strict'

var RelationalStore = require('./relational-util')
var _ = require('lodash')
var OpParser = require('./operator_parser')
var StandardQuery = require('seneca-standard-query')

function parseOr (entp, sTypes, current_name, current_value, params, values) {
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

function parseAnd (entp, sTypes, current_name, current_value, params, values) {
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

function parseExpression (entp, sTypes, current_name, current_value, params, values) {
  if (current_name === 'or$') {
    parseOr(entp, sTypes, current_name, current_value, params, values)
    return {}
  }

  if (current_name === 'and$') {
    parseAnd(entp, sTypes, current_name, current_value, params, values)
    return {}
  }

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
    var result = parseComplexSelectOperator(sTypes, current_name, current_value, params, values)
    if (result.err) {
      return result
    }
  }
  else {
    values.push(current_value)
    params.push(sTypes.escape + RelationalStore.escapeStr(RelationalStore.camelToSnakeCase(current_name)) + sTypes.escape + '=' + RelationalStore.preparedStatements(sTypes.name, values.length))
  }
  return {}
}

function parseComplexSelectOperator (sTypes, current_name, current_value, params, values) {
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

function parseExtendedExpression(entp, sTypes, current_name, current_value, params, values) {
  var result = parseExpression(entp, sTypes, current_name, current_value, params, values)
  return result
}

var buildQueryFromExpression = function (entp, query_parameters, sTypes, values) {
  var params = []
  values = values || []

  if (!_.isEmpty(query_parameters) && query_parameters.params.length > 0) {
    for (var i in query_parameters.params) {
      var current_name = query_parameters.params[i]
      var current_value = query_parameters.values[i]

      var result = parseExtendedExpression(entp, sTypes, current_name, current_value, params, values)
      if (result.err) {
        return result
      }
    }

    return {err: null, data: params.join(' AND '), values: values}
  }
  else {
    return {values: values}
  }
}

function whereargs (entp, q) {
  return StandardQuery.whereargs(entp, q)
}

function selectstm (qent, q, sTypes, done) {
  StandardQuery.selectstmCustom(qent, q, sTypes, buildQueryFromExpression, done)
}

module.exports.buildQueryFromExpression = buildQueryFromExpression
module.exports.selectstm = selectstm
module.exports.fixPrepStatement = StandardQuery.fixPrepStatement
module.exports.selectstmOr = StandardQuery.selectstmOr
