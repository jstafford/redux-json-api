'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reducer = exports.requireResource = exports.deleteResource = exports.updateResource = exports.ensureResource = exports.readEndpoint = exports.createResource = exports.hydrateStore = exports.setAxiosConfig = exports.IS_UPDATING = exports.IS_DELETING = undefined;

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _promise2 = require('babel-runtime/core-js/promise');

var _promise3 = _interopRequireDefault(_promise2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _handleActions;

var _reduxActions = require('redux-actions');

var _objectPathImmutable = require('object-path-immutable');

var _objectPathImmutable2 = _interopRequireDefault(_objectPathImmutable);

var _stateMutation = require('./state-mutation');

var _utils = require('./utils');

var _constants = require('./constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Resource isInvalidating values
var IS_DELETING = exports.IS_DELETING = 'IS_DELETING';
var IS_UPDATING = exports.IS_UPDATING = 'IS_UPDATING';

// Action creators
var setAxiosConfig = exports.setAxiosConfig = (0, _reduxActions.createAction)(_constants.API_SET_AXIOS_CONFIG);

var hydrateStore = exports.hydrateStore = (0, _reduxActions.createAction)(_constants.API_HYDRATE);

var apiWillCreate = (0, _reduxActions.createAction)(_constants.API_WILL_CREATE);
var apiCreated = (0, _reduxActions.createAction)(_constants.API_CREATED);
var apiCreateFailed = (0, _reduxActions.createAction)(_constants.API_CREATE_FAILED);

var apiWillRead = (0, _reduxActions.createAction)(_constants.API_WILL_READ);
var apiRead = (0, _reduxActions.createAction)(_constants.API_READ);
var apiReadFailed = (0, _reduxActions.createAction)(_constants.API_READ_FAILED);

var apiWillUpdate = (0, _reduxActions.createAction)(_constants.API_WILL_UPDATE);
var apiUpdated = (0, _reduxActions.createAction)(_constants.API_UPDATED);
var apiUpdateFailed = (0, _reduxActions.createAction)(_constants.API_UPDATE_FAILED);

var apiWillDelete = (0, _reduxActions.createAction)(_constants.API_WILL_DELETE);
var apiDeleted = (0, _reduxActions.createAction)(_constants.API_DELETED);
var apiDeleteFailed = (0, _reduxActions.createAction)(_constants.API_DELETE_FAILED);

var createResource = exports.createResource = function createResource(resource) {
  return function (dispatch, getState) {
    dispatch(apiWillCreate(resource));

    var axiosConfig = getState().api.endpoint.axiosConfig;

    var options = (0, _extends3.default)({}, axiosConfig, {
      method: 'POST',
      data: (0, _stringify2.default)({
        data: resource
      })
    });

    return new _promise3.default(function (resolve, reject) {
      (0, _utils.apiRequest)(resource.type, options).then(function (json) {
        dispatch(apiCreated(json));
        resolve(json);
      }).catch(function (error) {
        var err = error;
        err.resource = resource;

        dispatch(apiCreateFailed(err));
        reject(err);
      });
    });
  };
};

var ApiResponse =
/* eslint-enable */
function ApiResponse(response, dispatch, nextUrl, prevUrl) {
  var _this = this;

  (0, _classCallCheck3.default)(this, ApiResponse);

  this.loadNext = function () {
    return _this.dispatch(readEndpoint(_this.nextUrl));
  };

  this.loadPrev = function () {
    return _this.dispatch(readEndpoint(_this.prevUrl));
  };

  this.body = response;
  this.dispatch = dispatch;
  this.nextUrl = nextUrl;
  this.prevUrl = prevUrl;
}

/* eslint-disable */
;

var readEndpoint = exports.readEndpoint = function readEndpoint(endpoint) {
  return function (dispatch, getState) {
    dispatch(apiWillRead(endpoint));

    var axiosConfig = getState().api.endpoint.axiosConfig;


    return new _promise3.default(function (resolve, reject) {
      (0, _utils.apiRequest)(endpoint, axiosConfig).then(function (json) {
        dispatch(apiRead((0, _extends3.default)({ endpoint: endpoint }, json)));

        var nextUrl = (0, _utils.getPaginationUrl)(json, 'next', axiosConfig.baseURL);
        var prevUrl = (0, _utils.getPaginationUrl)(json, 'prev', axiosConfig.baseURL);

        resolve(new ApiResponse(json, dispatch, nextUrl, prevUrl));
      }).catch(function (error) {
        var err = error;
        err.endpoint = endpoint;

        dispatch(apiReadFailed(err));
        reject(err);
      });
    });
  };
};

/**
 * The purpose of this function is to ensure that the specific resource, and
 * optionally the related resources for the relationships listed in the include
 * param are present in the state, or if not, that the resources are loaded with
 * as few extra calls as possible.
 * If the specified resource is not present, the include parameter
 * will be added to the url when requesting the resource.
 * If the specified resource is present, any missing related resources
 * indicated by the include param will be loaded with a filtered search,
 * using one request per resource type.
 */
var ensureResource = exports.ensureResource = function ensureResource(type, id, include) {
  return function (dispatch, getState) {
    var promises = [];
    var state = getState().api;
    if (!(0, _stateMutation.stateContainsResource)(state, { type: type, id: id })) {
      var url = include ? type + '/' + id + '?include=' + include : type + '/' + id;
      var promise = dispatch(readEndpoint(url));
      promises.push(promise);
    } else if (include) {
      var resourceRels = state.resources[type][id].relationships;
      var includeRels = include.split(',');
      var missingResources = {};
      includeRels.forEach(function (includedRel) {
        var includeList = resourceRels[includedRel].data;
        if (includeList) {
          includeList.forEach(function (item) {
            if (!(0, _stateMutation.stateContainsResource)(state, item)) {
              if (!missingResources[item.type]) {
                missingResources[item.type] = [];
              }
              missingResources[item.type].push(item.id);
            }
          });
        }
      });
      var missingTypes = (0, _keys2.default)(missingResources);
      missingTypes.forEach(function (missingType) {
        var missingIds = missingResources[missingType];
        if (missingIds.length) {
          var _url = missingType + '/?';
          var and = '';
          missingIds.forEach(function (missingId) {
            _url += and + 'filter[id]=' + missingId;
            and = '&';
          });
          var _promise = dispatch(readEndpoint(_url));
          promises.push(_promise);
        }
      });
    }
    return _promise3.default.all(promises);
  };
};

var updateResource = exports.updateResource = function updateResource(resource) {
  return function (dispatch, getState) {
    dispatch(apiWillUpdate(resource));

    var axiosConfig = getState().api.endpoint.axiosConfig;

    var endpoint = resource.type + '/' + resource.id;

    var options = (0, _extends3.default)({}, axiosConfig, {
      method: 'PATCH',
      data: {
        data: resource
      }
    });

    return new _promise3.default(function (resolve, reject) {
      (0, _utils.apiRequest)(endpoint, options).then(function (json) {
        dispatch(apiUpdated(json));
        resolve(json);
      }).catch(function (error) {
        var err = error;
        err.resource = resource;

        dispatch(apiUpdateFailed(err));
        reject(err);
      });
    });
  };
};

var deleteResource = exports.deleteResource = function deleteResource(resource) {
  return function (dispatch, getState) {
    dispatch(apiWillDelete(resource));

    var axiosConfig = getState().api.endpoint.axiosConfig;

    var endpoint = resource.type + '/' + resource.id;

    var options = (0, _extends3.default)({}, axiosConfig, {
      method: 'DELETE'
    });

    return new _promise3.default(function (resolve, reject) {
      (0, _utils.apiRequest)(endpoint, options).then(function () {
        dispatch(apiDeleted(resource));
        resolve();
      }).catch(function (error) {
        var err = error;
        err.resource = resource;

        dispatch(apiDeleteFailed(err));
        reject(err);
      });
    });
  };
};

var requireResource = exports.requireResource = function requireResource(resourceType) {
  var endpoint = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : resourceType;

  return function (dispatch, getState) {
    return new _promise3.default(function (resolve, reject) {
      var _getState = getState(),
          api = _getState.api;

      if (Object.prototype.hasOwnProperty.call(api, resourceType)) {
        resolve();
      }

      dispatch(readEndpoint(endpoint)).then(resolve).catch(reject);
    });
  };
};

// Reducers
var reducer = exports.reducer = (0, _reduxActions.handleActions)((_handleActions = {}, (0, _defineProperty3.default)(_handleActions, _constants.API_SET_AXIOS_CONFIG, function (state, _ref) {
  var axiosConfig = _ref.payload;

  return (0, _objectPathImmutable2.default)(state).set(['endpoint', 'axiosConfig'], axiosConfig).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_HYDRATE, function (state, _ref2) {
  var resources = _ref2.payload;

  var entities = Array.isArray(resources.data) ? resources.data : [resources.data];

  var newState = (0, _stateMutation.updateOrInsertResourcesIntoState)(state, entities.concat(resources.included || []));

  return (0, _objectPathImmutable2.default)(newState).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_WILL_CREATE, function (state) {
  return (0, _objectPathImmutable2.default)(state).set(['status', 'isCreating'], state.status.isCreating + 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_CREATED, function (state, _ref3) {
  var resources = _ref3.payload;

  var entities = Array.isArray(resources.data) ? resources.data : [resources.data];

  var newState = (0, _stateMutation.updateOrInsertResourcesIntoState)(state, entities.concat(resources.included || []));

  return (0, _objectPathImmutable2.default)(newState).set(['status', 'isCreating'], state.status.isCreating - 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_CREATE_FAILED, function (state) {
  return (0, _objectPathImmutable2.default)(state).set(['status', 'isCreating'], state.status.isCreating - 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_WILL_READ, function (state) {
  return (0, _objectPathImmutable2.default)(state).set(['status', 'isReading'], state.status.isReading + 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_READ, function (state, _ref4) {
  var payload = _ref4.payload;

  var resources = (Array.isArray(payload.data) ? payload.data : [payload.data]).concat(payload.included || []);

  var newState = (0, _stateMutation.updateOrInsertResourcesIntoState)(state, resources);

  if ((0, _utils.hasOwnProperties)(payload, ['links', 'self']) && payload.links.self.indexOf('sort') >= 0) {
    newState = (0, _stateMutation.updateOrCreateSortInState)(newState, payload);
  }

  return (0, _objectPathImmutable2.default)(newState).set(['status', 'isReading'], state.status.isReading - 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_READ_FAILED, function (state) {
  return (0, _objectPathImmutable2.default)(state).set(['status', 'isReading'], state.status.isReading - 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_WILL_UPDATE, function (state, _ref5) {
  var resource = _ref5.payload;
  var type = resource.type,
      id = resource.id;


  var newState = (0, _stateMutation.ensureResourceTypeInState)(state, type);

  return (0, _stateMutation.setIsInvalidatingForExistingResource)(newState, { type: type, id: id }, IS_UPDATING).set(['status', 'isUpdating'], state.status.isUpdating + 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_UPDATED, function (state, _ref6) {
  var resources = _ref6.payload;

  var entities = Array.isArray(resources.data) ? resources.data : [resources.data];

  var newState = (0, _stateMutation.updateOrInsertResourcesIntoState)(state, entities.concat(resources.included || []));

  return (0, _objectPathImmutable2.default)(newState).set(['status', 'isUpdating'], state.status.isUpdating - 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_UPDATE_FAILED, function (state, _ref7) {
  var resource = _ref7.payload.resource;
  var type = resource.type,
      id = resource.id;


  return (0, _stateMutation.setIsInvalidatingForExistingResource)(state, { type: type, id: id }, null).set(['status', 'isUpdating'], state.status.isUpdating - 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_WILL_DELETE, function (state, _ref8) {
  var resource = _ref8.payload;
  var type = resource.type,
      id = resource.id;


  return (0, _stateMutation.setIsInvalidatingForExistingResource)(state, { type: type, id: id }, IS_DELETING).set(['status', 'isDeleting'], state.status.isDeleting + 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_DELETED, function (state, _ref9) {
  var resource = _ref9.payload;

  return (0, _stateMutation.removeResourceFromState)(state, resource).set(['status', 'isDeleting'], state.status.isDeleting - 1).value();
}), (0, _defineProperty3.default)(_handleActions, _constants.API_DELETE_FAILED, function (state, _ref10) {
  var resource = _ref10.payload.resource;
  var type = resource.type,
      id = resource.id;


  return (0, _stateMutation.setIsInvalidatingForExistingResource)(state, { type: type, id: id }, null).set(['status', 'isDeleting'], state.status.isDeleting - 1).value();
}), _handleActions), {
  status: {
    isCreating: 0,
    isReading: 0,
    isUpdating: 0,
    isDeleting: 0
  },
  endpoint: {
    axiosConfig: {}
  },
  resources: {},
  sorts: {}
});