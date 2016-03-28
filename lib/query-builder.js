'use strict'

var _ = require('lodash')
var OpParser = require('./operator_parser')
var StandardQuery = require('seneca-standard-query')

function parseExtendedExpression (entp, sTypes, current_name, current_value, params, values) {
  function parseComplexSelectOperator (sTypes, current_name, current_value, params, values) {
    var result = {
      processed: false
    }

    for (var op in current_value) {
      var op_val = current_value[op]
      if (!OpParser[op]) {
        result.err = 'This operator is not yet implemented: ' + op
        return result
      }
      var err = OpParser[op](current_name, op_val, params, values, sTypes)
      if (err) {
        result.err = err
        return result
      }

      result.processed = true
    }

    return result
  }

  var result = StandardQuery.parseExpression(entp, sTypes, current_name, current_value, params, values)

  if (!result.processed) {
    if (_.isObject(current_value)) {
      result = parseComplexSelectOperator(sTypes, current_name, current_value, params, values)
      if (result.err) {
        return result
      }
    }
  }

  return result
}

function buildQueryFromExpression (entp, query_parameters, sTypes, values) {
  return StandardQuery.buildQueryFromExpressionCustom(entp, query_parameters, sTypes, values, parseExtendedExpression)
}

function selectstm (qent, q, sTypes, done) {
  StandardQuery.selectstmCustom(qent, q, sTypes, buildQueryFromExpression, done)
}

module.exports.selectstm = selectstm
module.exports.fixPrepStatement = StandardQuery.fixPrepStatement
module.exports.selectstmOr = StandardQuery.selectstmOr
