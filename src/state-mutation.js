import equal from 'fast-deep-equal';
import imm from 'object-path-immutable';
import { hasOwnProperties } from './utils';

const stateContainsResource = (state, resource) => {
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
      if (!resource.relationships[relationship].data && hasOwnProperties(curResource, ['relationships', relationship])) {
        relationships[relationship] = curResource.relationships[relationship];
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
