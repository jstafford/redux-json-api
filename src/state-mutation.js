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

export const ensureSortsTypeInState = (state, type) => {
  const path = ['sorts', type];
  return hasOwnProperties(state, path)
    ? state
    : imm(state).set(path, {}).value();
};

export const ensureSortIdInState = (state, type, sortId) => {
  const newState = ensureSortsTypeInState(state, type);
  const path = ['sorts', type, sortId];
  return hasOwnProperties(newState, path)
    ? newState
    : imm(newState).set(path, {}).value();
};

export const updateOrCreateSortInState = (state, payload) => {
  // sanity check
  if (!Array.isArray(payload.data) || payload.data.length < 1) {
    return state;
  }

  // extract the sortID from the payload
  const queryOffset = payload.links.self.lastIndexOf('?');
  const queryStr = payload.links.self.substring(queryOffset + 1);
  const queryArray = queryStr.split('&');
  const sortId = queryArray.filter(item => (!item.startsWith('page'))).join('&');

  // clone the existing sort ids array, or make a new one if not present
  const { type } = payload.data[0];
  const newState = ensureSortIdInState(state, type, sortId);
  const updatePath = ['sorts', type, sortId, 'ids'];
  const existingSort = safeGet(newState, updatePath, null);
  const updatedSort = existingSort ? existingSort.slice() : [];

  // insert the ids from the payload into the new sort Ids
  const offset = safeGet(payload, ['meta', 'page', 'offset'], 0);
  const idsLen = offset + payload.data.length;
  if (updatedSort.length < idsLen) {
    updatedSort.length = idsLen;
  }
  payload.data.forEach((item, index) => {
    updatedSort[offset + index] = item.id;
  });

  // update the newState
  const total = safeGet(payload, ['meta', 'page', 'total'], Number.NaN);
  return imm(newState)
    .set(updatePath, updatedSort)
    .set(['sorts', type, sortId, 'total'], total)
    .value();
};
