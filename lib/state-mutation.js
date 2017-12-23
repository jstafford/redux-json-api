'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateOrCreateSortInState = exports.ensureResourceTypeInState = exports.setIsInvalidatingForExistingResource = exports.updateOrInsertResourcesIntoState = exports.removeResourceFromState = exports.stateContainsResource = undefined;

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _fastDeepEqual = require('fast-deep-equal');

var _fastDeepEqual2 = _interopRequireDefault(_fastDeepEqual);

var _objectPathImmutable = require('object-path-immutable');

var _objectPathImmutable2 = _interopRequireDefault(_objectPathImmutable);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var stateContainsResource = exports.stateContainsResource = function stateContainsResource(state, resource) {
  var updatePath = ['resources', resource.type, resource.id];

  return (0, _utils.hasOwnProperties)(state, updatePath);
};

var updateOrInsertResource = function updateOrInsertResource(state, resource) {
  if ((typeof resource === 'undefined' ? 'undefined' : (0, _typeof3.default)(resource)) !== 'object') {
    return state;
  }

  var newState = state;
  var updatePath = ['resources', resource.type, resource.id];

  if (stateContainsResource(state, resource)) {
    var curResource = state.resources[resource.type][resource.id];

    var relationships = {};
    (0, _keys2.default)(resource.relationships).forEach(function (relationship) {
      if (!resource.relationships[relationship].data) {
        var relatedResources = (0, _utils.safeGet)(curResource, ['relationships', relationship], null);
        if (relatedResources) {
          relationships[relationship] = relatedResources;
        }
      }
    });
    var immResource = (0, _objectPathImmutable2.default)(resource).set(['relationships'], relationships).value();

    if (!(0, _fastDeepEqual2.default)(curResource, immResource)) {
      newState = _objectPathImmutable2.default.set(newState, updatePath, resource);
    }
  } else {
    newState = _objectPathImmutable2.default.set(newState, updatePath, resource);
  }

  return newState;
};

var removeResourceFromState = exports.removeResourceFromState = function removeResourceFromState(state, resource) {
  var path = ['resources', resource.type, resource.id];

  return (0, _objectPathImmutable2.default)(state).del(path);
};

var updateOrInsertResourcesIntoState = exports.updateOrInsertResourcesIntoState = function updateOrInsertResourcesIntoState(state, resources) {
  return resources.reduce(updateOrInsertResource, state);
};

var setIsInvalidatingForExistingResource = exports.setIsInvalidatingForExistingResource = function setIsInvalidatingForExistingResource(state, _ref) {
  var type = _ref.type,
      id = _ref.id;
  var value = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  var updatePath = ['resources', type, id, 'isInvalidating'];

  return value === null ? (0, _objectPathImmutable2.default)(state).del(updatePath) : (0, _objectPathImmutable2.default)(state).set(updatePath, value);
};

var ensureResourceTypeInState = exports.ensureResourceTypeInState = function ensureResourceTypeInState(state, type) {
  var path = ['resources', type];
  return (0, _utils.hasOwnProperties)(state, path) ? state : (0, _objectPathImmutable2.default)(state).set(path, {}).value();
};

var updateOrCreateSortInState = exports.updateOrCreateSortInState = function updateOrCreateSortInState(state, payload) {
  // sanity check
  if (!Array.isArray(payload.data) || payload.data.length < 1) {
    return state;
  }

  // extract the sortID from the payload
  var queryOffset = payload.links.self.lastIndexOf('?');
  var queryStr = payload.links.self.substring(queryOffset + 1);
  var queryArray = queryStr.split('&');
  var sortId = queryArray.filter(function (item) {
    return item.startsWith('sort') || item.startsWith('filter');
  }).join('&');

  // clone the existing sort ids array, or make a new one if not present
  var type = payload.data[0].type;

  var updatePath = ['sorts', type, sortId, 'ids'];
  var existingSort = (0, _utils.safeGet)(state, updatePath, null);
  var updatedSort = existingSort ? existingSort.slice() : [];

  // insert the ids from the payload into the new sort Ids
  var offset = (0, _utils.safeGet)(payload, ['meta', 'page', 'offset'], 0);
  var idsLen = offset + payload.data.length;
  if (updatedSort.length < idsLen) {
    updatedSort.length = idsLen;
  }
  payload.data.forEach(function (item, index) {
    updatedSort[offset + index] = item.id;
  });

  // update the state
  var total = (0, _utils.safeGet)(payload, ['meta', 'page', 'total'], Number.NaN);
  return (0, _objectPathImmutable2.default)(state).set(updatePath, updatedSort).set(['sorts', type, sortId, 'total'], total).value();
};