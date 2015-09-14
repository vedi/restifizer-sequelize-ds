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

SequelizeDataSource.prototype.initialize = function initialize(options) {
  this.associationFieldList = options.associationFieldList;
};

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
  var query = {
    raw: true,
    nest: true,
    where: filter,
    attributes: fields
  };

  this._normalizeFields(fields, filter, query);

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

  this.ModelClass.findAll(query).nodeify(callback);
};

SequelizeDataSource.prototype.findOneAsync = function findOneAsync(options) {
  var filter = options.filter;
  var fields = options.fields;
  var queryPipe = options.queryPipe;

  this._normalizeFilter(filter, this.ModelClass);

  var query = {where: filter, attributes: fields};

  this._normalizeFields(fields, filter, query);

  if (queryPipe) {
    queryPipe(query);
  }
  return this.ModelClass.findOne(query);
};

SequelizeDataSource.prototype.create = function create(data, callback) {
  return callback(null, this.ModelClass.build(data));
};

SequelizeDataSource.prototype.saveAsync = function saveAsync(doc) {
  return doc.save().
    then(function (newDoc) {
      return newDoc;
    });
};

SequelizeDataSource.prototype.removeAsync = function removeAsync(doc) {
  return doc.destroy().then(function () {
    return doc;
  });
};

SequelizeDataSource.prototype.countAsync = function countAsync(filter) {
  // TODO: Implement
  //this._normalizeFilter(filter, this.ModelClass);
  //return this.ModelClass.count(filter).exec(callback);
};

SequelizeDataSource.prototype.toObject = function toObject(model) {
  return model.get({
    plain: true
  });
};

SequelizeDataSource.prototype.getFieldValue = function getFieldValue(model, fieldName) {
  return resolveProp(model, fieldName);
};

SequelizeDataSource.prototype.setFieldValue = function getFieldValue(model, fieldName, value) {
  setProp(model, fieldName, value);
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

SequelizeDataSource.prototype._normalizeFields = function _normalizeFields(fields, filter, query) {
  var associationFields = [];
  query.include = query.include || [];
  _.each(fields, function (field) {
    var association = this.ModelClass.associations[field];
    if (association) {
      associationFields.push(field);
      // put to include
      query.include.push({
        association: association,
        attributes: this.associationFieldList && this.associationFieldList[field] ?
          this.associationFieldList[field] : [association.targetKey]
      });
    }
  }, this);

  _.each(associationFields, function (field) {
    _.pull(fields, field);
  });
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

var resolveProp = function resolveProp(obj, stringPath) {
  stringPath = stringPath.replace(/\[(\w+)]/g, '.$1');  // convert indexes to properties
  stringPath = stringPath.replace(/^\./, '');           // strip a leading dot
  var pathArray = stringPath.split('.');
  while (pathArray.length) {
    var pathItem = pathArray.shift();
    if (pathItem in obj) {
      obj = obj[pathItem];
    } else {
      return;
    }
  }
  return obj;
};

var setProp = function setProp(obj, stringPath, value) {
  stringPath = stringPath.replace(/\[(\w+)]/g, '.$1');  // convert indexes to properties
  stringPath = stringPath.replace(/^\./, '');           // strip a leading dot
  var pathArray = stringPath.split('.');
  while (pathArray.length - 1) {
    var pathItem = pathArray.shift();
    if (pathItem in obj) {
      obj = obj[pathItem];
    } else {
      return;
    }
  }
  return obj[pathArray.length ? pathArray[0] : stringPath] = value;
};

module.exports = SequelizeDataSource;


