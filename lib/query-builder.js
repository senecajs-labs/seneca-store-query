'use strict'

var _ = require('lodash')
var OpParser = require('./operator_parser')

module.exports = function (seneca, opts) {
  var StandardQuery
  seneca.ready(function () {
    StandardQuery = seneca.export('standard-query/utils')
  })

  function parseExtendedExpression (sTypes, currentName, currentValue, params, values) {
    function parseComplexSelectOperator (sTypes, currentName, currentValue, params, values) {
      var result = {
        processed: false
      }

      for (var op in currentValue) {
        var op_val = currentValue[op]
        if (!OpParser[op]) {
          result.err = 'This operator is not yet implemented: ' + op
          return result
        }
        var err = OpParser[op](currentName, op_val, params, values, sTypes)
        if (err) {
          result.err = err
          return result
        }

        result.processed = true
      }

      return result
    }

    var result = StandardQuery.parseExpression(sTypes, currentName, currentValue, params, values)

    if (!result.processed) {
      if (_.isObject(currentValue)) {
        result = parseComplexSelectOperator(sTypes, currentName, currentValue, params, values)
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

  function fixPrepStatement (stm, sTypes) {
    return StandardQuery.fixPrepStatement(stm, sTypes)
  }

  function selectstmOr (qent, q, sTypes) {
    return StandardQuery.selectstmOr(qent, q, sTypes)
  }

  return {
    selectstm: selectstm,
    fixPrepStatement: fixPrepStatement,
    selectstmOr: selectstmOr
  }
}
