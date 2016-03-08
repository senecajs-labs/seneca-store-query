![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js](http://senecajs.org) data storage plugin

seneca-store-query
=======================

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Dependency Status][david-badge]][david-url]
[![Gitter][gitter-badge]][gitter-url]

seneca-store-query is a plugin for the [Seneca][seneca] MVP toolkit that extends the query capabilites of the [Seneca][seneca] store plugins. It currently works with [seneca-postgres-store][postgres-store] and [seneca-mysql-store][mysql-store]

```js
Usage:

    var Seneca = require('seneca')
    var si = Seneca()

    var DBConfig = {
      name: 'senecatest',
      host: 'localhost',
      username: 'senecatest',
      password: 'senecatest',
      port: 5432
    }
    ...

    si.use(require('seneca-postgres-store'), DBConfig)
    si.use(require('seneca-store-query'))
    si.ready(function() {
      var product = si.make('product')
      ...
    })
    ...
```

## Seneca extended query format

This plugin extends the basic store functionality with support for more complex queries.

### Comparison query operators

list$ is extended with the following comparison operators:

- ne$: `.list$({ f1: {ne$: v1} })` for not-equal. 
- eq$: `.list$({ f1: {eq$: v1} })` for equal. 
- lte$: `.list$({ f1: {lte$: 5} })` for less than or equal. 
- lt$: `.list$({ f1: {lt$: 5} })` for less than. 
- gte$: `.list$({ f1: {gte$: 5} })` for greater than or equal. 
- gt$: `.list$({ f1: {gt$: 5} })` for greater than. 
- in$: `.list$({ f1: {in$: [10, 20]} })` for in. in$ operator accepts only values of type array. 
- nin$: `.list$({ f1: {nin$: ['v1', 'v2']} })` for not-in. nin$ operator accepts only values of type array. 


Note: you can use `sort$`, `limit$`, `skip$` and `fields$` together.

Note: you can use any operators described above together.

### Logical query operators

list$ is extended with the following logical operators:

- or$: `.list$({ or$: [{name: 'something'}, {price: 200}]})`
- and$: `.list$({ and$: [{name: 'something'}, {price: 200}]})`

Note: These logical operators accepts only arrays as values.

Note: These operators can be used together to build more complex queries

Note: These logical operators can be used also with any Comparison query operators described above.

Note: A complex example:

```js
ent.list$( 
  { 
    or$: [
      {name: 'something'}, 
      {
        and$: [
          {price: {gte$: 100}}, 
          {name: 'other'}
        ]
      }, 
      {color: { ne$: 'red' }}
    ], 
    sort$: {name: 1},
    fields$: ['name', 'color']
  }, function(err, list){
    // do something with result...
  } )
```

## Limits

By default queries are limited to 20 values. This can be bypassed by passing the `nolimit` option, which if set to true will not limit any queries.

## Fields

To filter the fields returned from the `list` operation, pass a `fields$` array of column names to return. If no `fields$` are passed, all fields are returned (i.e. `select *` is used). e.g.

    query.fields$ = ['id', 'name']


Note: The implicit id that is generated on save$ has an uuid value. To override this you must provide entity.id$ with a desired value.


## Contributing
We encourage participation. If you feel you can help in any way, be it with
examples, extra testing, or new features please get in touch.


[npm-badge]: https://img.shields.io/npm/v/seneca-store-query.svg
[npm-url]: https://npmjs.com/package/seneca-store-query
[travis-badge]: https://api.travis-ci.org/senecajs/seneca-store-query.svg
[travis-url]: https://travis-ci.org/senecajs/seneca-store-query
[david-badge]: https://david-dm.org/senecajs/seneca-store-query.svg
[david-url]: https://david-dm.org/senecajs/seneca-store-query
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/senecajs/seneca
[seneca]: http://senecajs.org/
[postgres-store]: https://github.com/senecajs/seneca-postgres-store
[mysql-store]: https://github.com/senecajs/seneca-mysql-store
