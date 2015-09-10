[![NPM](https://nodei.co/npm/restifizer-sequelize-ds.png?compact=true)](https://npmjs.org/package/restifizer-sequelize-ds)

> We are working hard to create documentation. If you have exact questions or ideas how we can improve documentation, create a ticket here: https://github.com/vedi/restifizer-mongoose-ds/issues

> Any feedback is appreciated.

Sequelize Data Source for Restifizer
==========

Restifizer - it's a way to significantly simplify creation of full-functional RESTful services. It's available at:
https://github.com/vedi/restifizer

This Data Source allows you to use a sequelize model in your REST service. For example:

```
  SequelizeDataSource = require('restifizer-sequelize-ds'),
  User = sequelize.model('User'),

...

module.exports = BaseController.extend({
  dataSource: new SequelizeDataSource(User),
...

```

