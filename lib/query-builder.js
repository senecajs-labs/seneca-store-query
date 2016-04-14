'use strict'

var _ = require('lodash')
var OpParser = require('./operator_parser')

module.exports = function (seneca) {
  var StandardQuery = seneca.export('standard-query/utils')

  function parseExtendedExpression (sTypes, currentName, currentValue, params, values) {
    function parseComplexSelectOperator (sTypes, currentName, currentValue, params, values) {
      var result = {}

      result.processed = _.every(currentValue, function (opVal, op) {
        if (!OpParser[op]) {
          result.err = 'This operator is not yet implemented: ' + op
          return false
        }
        var err = OpParser[op](currentName, opVal, params, values, sTypes)
        if (err) {
          result.err = err
          return false
        }

        return true
      })

      return result
    }

    var result = StandardQuery.parseExpression(sTypes, currentName, currentValue, params, values)

    if (!result.processed && _.isObject(currentValue)) {
      result = parseComplexSelectOperator(sTypes, currentName, currentValue, params, values)
      if (result.err) {
        return result
      }
    }

    return result
  }

  function buildQueryFromExpression (entp, queryParameters, sTypes, values) {
    return StandardQuery.buildQueryFromExpressionCustom(entp, queryParameters, sTypes, values, parseExtendedExpression)
  }

  function selectstm (qent, q, sTypes, done) {
    StandardQuery.selectstmCustom(qent, q, sTypes, buildQueryFromExpression, done)
  }

  return {
    selectstm: selectstm,
    fixPrepStatement: StandardQuery.fixPrepStatement,
    selectstmOr: StandardQuery.selectstmOr,
    buildSelectStatement: StandardQuery.buildSelectStatement
  }
}
