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
  this.idField = options.idField;
  this.fieldMap = options.fieldMap || {};
  this.modelFieldNames = options.modelFieldNames;
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
  var query = {};

  query.attributes = this._normalizeFields(fields, filter, query);

  query.where = filter;

  if (sort) {
    query.order = [];
    _.forOwn(sort, function (value, key) {
      query.order.push([key, +value > 0 ? 'ASC' : 'DESC']);
    });
    //query.order = sort;
  }
  query.limit = limit;
  if (skip > 0) {
    query.offset = skip;
  }
  if (queryPipe) {
    queryPipe(query);
  }

  var _this = this;

  this.ModelClass.findAll(query).
    then(function(docs) {
      return _.map(docs, function (doc) {
        return _this.toObject(doc);
      });
    }).
    nodeify(callback);
};

SequelizeDataSource.prototype.findOneAsync = function findOneAsync(options) {
  var filter = options.filter;
  var fields = options.fields;
  var queryPipe = options.queryPipe;

  this._normalizeFilter(filter, this.ModelClass);

  var query = {};

  query.attributes = this._normalizeFields(fields, filter, query);

  query.where = filter;

  if (queryPipe) {
    queryPipe(query);
  }
  return this.ModelClass.findOne(query);
};

SequelizeDataSource.prototype.create = function create(data, callback) {
  return callback(null, this.ModelClass.build(data));
};

SequelizeDataSource.prototype.saveAsync = function saveAsync(doc) {
  var _this = this;
  return doc.save().
    then(function (newDoc) {
      return _this.findOneAsync({filter: newDoc[_this.idField], fields: _this.fieldMap});
    }).
    then(function (result) {
      return result;
    });
};

SequelizeDataSource.prototype.removeAsync = function removeAsync(doc) {
  return doc.destroy().then(function () {
    return doc;
  });
};

SequelizeDataSource.prototype.countAsync = function countAsync(filter) {
  this._normalizeFilter(filter, this.ModelClass);

  var query = {};
  this._normalizeFields(this.modelFieldNames || this.getModelFieldNames(), filter, query, true); // for filtering by associations
  query.where = filter;

  return this.ModelClass.count(query);
};

SequelizeDataSource.prototype.toObject = function toObject(model) {
  return model.get({
    plain: true
  });
};

SequelizeDataSource.prototype.getFieldValue = function getFieldValue(model, fieldName) {
  return this._resolveProp(model, fieldName);
};

SequelizeDataSource.prototype.setFieldValue = function setFieldValue(model, fieldName, value) {
  this._setProp(model, fieldName, value);
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

SequelizeDataSource.prototype.assignField = function assignField(dest, source, fieldName, req, callback) {
  if (_.isFunction(dest.set)) {
    dest.set(fieldName, source[fieldName]);
  } else {
    // on insert we come here
    this._setProp(dest, fieldName, source[fieldName]);
  }
  callback();
};

SequelizeDataSource.prototype.getModelFieldNames = function getModelFieldNames() {
  return _.keys(this.ModelClass.rawAttributes);
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
    obj[qField] = {$like: '%' + q + '%'};
    qExpr.push(obj);
  });
  return qExpr;
};

/**
 * @param fields
 * @param filter
 * @param query
 * @param filterDriven if set, `include`s will be created for filtered values only
 * @returns {*}
 * @private
 */
SequelizeDataSource.prototype._normalizeFields = function _normalizeFields(fields, filter, query, filterDriven) {
  query.include = query.include || [];
  fields = this._resolveAssociations(this.ModelClass, this.fieldMap, fields, filter, query.include, filterDriven);

  if (!filterDriven && !fields.indexOf(this.ModelClass.primaryKeyField) < 0) {
    fields.push(this.ModelClass.primaryKeyField);
  }

  return fields;
};

SequelizeDataSource.prototype._resolveAssociations = function (ModelClass, fieldMap, fields, filter, include, filterDriven) {
  include = include || [];
  var fieldsToRemove = [];
  var filterToRemove = [];
  var result = _.map(fields, function (field) {
    var isObject = typeof(field) === 'object';
    var fieldName = isObject ? field.name : field;
    var fieldMeta = fieldMap[fieldName];
    var association = ModelClass.associations[fieldName];
    if (fieldMeta && association) {
      if (!filterDriven) {
        fieldsToRemove.push(fieldName);
      }

      var associationFields;
      if (isObject && field.fields) {
        associationFields = field.fields;
      } else if (fieldMeta.fields) {
        associationFields = fieldMeta.fields;
      } else {
        associationFields = [association.targetKey];
      }

      var filterValue = filter ? filter[fieldName] : undefined;

      var nestedInclude = [];

      associationFields = this._resolveAssociations(association.target, fieldMeta.fields, associationFields, filterValue, nestedInclude, filterDriven);

      var cleanFilterValue = filterValue ? _.transform(filterValue, function (result, value, key) {
        if (associationFields.indexOf(key) >= 0) {
          result[key] = value;
        }
        return result;
      }) : undefined;

      if (cleanFilterValue) {
        filterToRemove.push(fieldName);
      }

      if (!filterDriven || cleanFilterValue) {
        // put to include
        include.push({
          association: association,
          attributes: associationFields,
          include: nestedInclude,
          where: cleanFilterValue
        });
      }
    }
    return fieldName;
  }, this);

  if (!filterDriven) {
    _.each(fieldsToRemove, function (field) {
      _.pull(result, field);
    });
  }

  _.each(filterToRemove, function (filterItem) {
    delete filter[filterItem];
  });

  return result;
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

SequelizeDataSource.prototype._resolveProp = function _resolveProp(obj, stringPath) {
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

SequelizeDataSource.prototype._setProp = function _setProp(obj, stringPath, value) {
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


SequelizeDataSource.prototype.defaultIdField = 'id';
SequelizeDataSource.prototype.defaultArrayMethods = ['$addToSet', '$pop', '$push', '$pull'];

module.exports = SequelizeDataSource;


