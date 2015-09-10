/**
 * Created by vedi on 09/02/15.
 */
'use strict';

var
  _ = require('lodash'),
  HTTP_STATUSES   = require('http-statuses');


function SequelizeDataSource(ModelClass) {
  this.ModelClass = ModelClass;
}

SequelizeDataSource.prototype.find = function find(options, callback) {
  var filter = options.filter;
  var fields = options.fields;
  var q = options.q;
  var qFields = options.qFields;
  var sort = options.sort;
  var limit = options.limit;
  var skip = options.skip;
  var queryPipe = options.queryPipe;

  this._normalizeFilter(filter, this.ModelClass);

  var qExpr = q ? this._buildQ(qFields, q) : undefined;
  if (!_.isUndefined(qExpr) && qExpr.length > 0) {
    filter.$or = qExpr;
  }
  var query = {raw: true, where: filter, attributes: fields};

  if (sort) {
    query.order = sort;
  }
  query.limit = limit;
  if (skip > 0) {
    query.skip = skip;
  }
  if (queryPipe) {
    queryPipe(query);
  }

  this.ModelClass.find(query).nodeify(callback);
};

SequelizeDataSource.prototype.findOne = function findOne(options, callback) {
  // TODO: Test
  var filter = options.filter;
  var fields = options.fields;
  var queryPipe = options.queryPipe;

  this._normalizeFilter(filter, this.ModelClass);

  var query = {where: filter, attributes: fields};
  if (queryPipe) {
    queryPipe(query);
  }
  this.ModelClass.findOne(query).nodeify(callback);
};

SequelizeDataSource.prototype.create = function create(data, callback) {
  return callback(null, this.ModelClass.build(data));
};

SequelizeDataSource.prototype.save = function save(doc, callback) {
  return doc.save().nodeify(function (err) {
    callback(err, doc);
  });
};

SequelizeDataSource.prototype.remove = function remove(doc, callback) {
  return doc.destroy().nodeify(callback);
};

SequelizeDataSource.prototype.count = function count(filter, callback) {
  this._normalizeFilter(filter, this.ModelClass);
  return this.ModelClass.count(filter).exec(callback);
};

SequelizeDataSource.prototype.toObject = function toObject(model) {
  return model.get({
    plain: true
  });
};

SequelizeDataSource.prototype.proceedArrayMethod = function proceedArrayMethod(dest, source, methodName, fieldName, req) {
  // TODO: Implement
  //// get sure we have an array
  //if (dest[fieldName] === undefined) {
  //  dest[fieldName] = [];
  //}
  //
  //if (methodName === '$addToSet') {
  //  dest[fieldName].addToSet(source);
  //} else if (methodName === '$pop') {
  //  if (source === 1) {
  //    dest[fieldName].pop();
  //  } else if (source === -1) {
  //    dest[fieldName].shift();
  //  } else {
  //    throw new Error('Illegal param value for $pop method');
  //  }
  //} else if (methodName === '$push') {
  //  dest[fieldName].push(source);
  //} else if (methodName === '$pull') {
  //  dest[fieldName].pull(source);
  //}
};

SequelizeDataSource.prototype.getModelFieldNames = function getModelFieldNames() {
  var attributes = _.keys(this.ModelClass.rawAttributes);
  return attributes;
};

SequelizeDataSource.prototype.parseError = function parseError(err) {
  // TODO: Implement
  var result = {};
  if (err.name == 'SequelizeValidationError') {
    result.status = HTTP_STATUSES.BAD_REQUEST;
    result.details = err.message;
  }
  //else if (err.name == 'CastError') {
  //  result.status = HTTP_STATUSES.BAD_REQUEST;
  //  result.details = {};
  //  result.details[err.path] = {
  //    message: err.message,
  //    name: err.name,
  //    path: err.path,
  //    type: err.type,
  //    value: err.value
  //  };
  //  result.message = 'CastError';
  //}
  //else if (err.name == 'MongoError' && (err.code == 11000 || err.code == 11001)) { // E11000(1) duplicate key error index
  //  result.status = HTTP_STATUSES.BAD_REQUEST;
  //  result.details = err.err;
  //}
  //else if (err.name == 'VersionError') {
  //  result.status = HTTP_STATUSES.CONFLICT;
  //  result.details = err.message;
  //} else {
  //  return;
  //}
  else {
    // it's just for testing
    result.status = HTTP_STATUSES.BAD_REQUEST;
    result.details = err.message;
  }

  return result;
};

SequelizeDataSource.prototype._buildQ = function _buildQ(qFields, q) {
  var qExpr = [];
  _.forEach(qFields, function (qField) {
    var obj = {};
    obj[qField] = {$iLike: '%' + q + '%'};
    qExpr.push(obj);
  });
  return qExpr;
};

SequelizeDataSource.prototype._normalizeFilter = function _normalizeFilter(filter, root) {
  // TODO: Implement
  //_.forEach(_.keys(filter), function (key) {
  //  var path = root.schema.paths[key];
  //  // if it's an operator
  //  if (key.substr(0, 1) === '$') {
  //    // increase the level without changing the root
  //    this._normalizeFilter(filter[key], root);
  //  } else if (path) {
  //    var typeName = path.options.type.name;
  //    // it's embedded document
  //    if (!_.isUndefined(path.schema)) {
  //      this._normalizeFilter(filter[key], root.schema.paths[key]);
  //    } else if (typeName === 'ObjectId') {
  //      if (typeof(filter[key]) === 'string') {
  //        filter[key] = ObjectID(filter[key]);
  //      }
  //    } else if (typeName === 'Date') {
  //      if (typeof(filter[key]) === 'string') {
  //        filter[key] = new Date(filter[key]);
  //      }
  //      else if (typeof(filter[key]) === 'object') {
  //        _.forOwn(filter[key], function (value, innerKey) {
  //          if (typeof(value) === 'string') {
  //            filter[key][innerKey] = new Date(value);
  //          }
  //        });
  //      }
  //    }
  //  }
  //}, this);
};

SequelizeDataSource.prototype.defaultIdField = 'id';
SequelizeDataSource.prototype.defaultArrayMethods = ['$addToSet', '$pop', '$push', '$pull'];

module.exports = SequelizeDataSource;


