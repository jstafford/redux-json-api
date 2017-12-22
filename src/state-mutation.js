import equal from 'fast-deep-equal';
import imm from 'object-path-immutable';
import { hasOwnProperties, safeGet } from './utils';

export const stateContainsResource = (state, resource) => {
  const updatePath = ['resources', resource.type, resource.id];

  return hasOwnProperties(state, updatePath);
};

const updateOrInsertResource = (state, resource) => {
  if (typeof resource !== 'object') {
    return state;
  }

  let newState = state;
  const updatePath = ['resources', resource.type, resource.id];

  if (stateContainsResource(state, resource)) {
    const curResource = state.resources[resource.type][resource.id];

    const relationships = {};
    Object.keys(resource.relationships).forEach((relationship) => {
      if (!resource.relationships[relationship].data) {
        const relatedResources = safeGet(curResource, ['relationships', relationship], null);
        if (relatedResources) {
          relationships[relationship] = relatedResources;
        }
      }
    });
    const immResource = imm(resource).set(['relationships'], relationships).value();

    if (!equal(curResource, immResource)) {
      newState = imm.set(newState, updatePath, resource);
    }
  } else {
    newState = imm.set(newState, updatePath, resource);
  }

  return newState;
};

export const removeResourceFromState = (state, resource) => {
  const path = ['resources', resource.type, resource.id];

  return imm(state).del(path);
};

export const updateOrInsertResourcesIntoState = (state, resources) => {
  return resources.reduce(updateOrInsertResource, state);
};

export const setIsInvalidatingForExistingResource = (state, { type, id }, value = null) => {
  const updatePath = ['resources', type, id, 'isInvalidating'];

  return value === null
    ? imm(state).del(updatePath)
    : imm(state).set(updatePath, value);
};

export const ensureResourceTypeInState = (state, type) => {
  const path = ['resources', type];
  return hasOwnProperties(state, path)
    ? state
    : imm(state).set(path, {}).value();
};

export const updateOrCreateSortInState = (state, payload) => {
  if (!Array.isArray(payload.data) || payload.data.length < 1) {
    return state;
  }
  const queryOffset = payload.links.self.lastIndexOf('?');
  const queryStr = payload.links.self.substring(queryOffset + 1);
  const queryArray = queryStr.split('&');
  const sortId = queryArray.filter(item => (item.startsWith('sort') || item.startsWith('filter'))).join('&');
  const { type } = payload.data[0];
  const offset = safeGet(payload, ['meta', 'page', 'offset'], 0);
  const totalLen = safeGet(payload, ['meta', 'page', 'total'], Number.NaN);
  const workingLen = totalLen !== Number.NaN ? totalLen : offset + payload.data.length;
  const updatePath = ['sorts', type, sortId];
  const existingSort = safeGet(state, updatePath, null);
  let updatedSort;
  // Discard existingSort if totalLen is provided and the lengths don’t match.
  // This means that resources have either been inserted or deleted,
  // but we have no way of knowing where in the sort order.
  if (!existingSort || (totalLen && existingSort.length !== totalLen)) {
    updatedSort = [];
  } else {
    // clone the existingSort
    updatedSort = existingSort.slice();
  }
  if (updatedSort.length < workingLen) {
    updatedSort.length = workingLen;
  }
  payload.data.forEach((item, index) => {
    updatedSort[offset + index] = item.id;
  });

  return imm(state).set(updatePath, updatedSort).value();
};
