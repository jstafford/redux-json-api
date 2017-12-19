import equal from 'fast-deep-equal';
import imm from 'object-path-immutable';
import { hasOwnProperties } from './utils';

const stateContainsResource = (state, resource) => {
  const updatePath = ['resources', resource.type, 'data'];

  if (hasOwnProperties(state, updatePath)) {
    return state.resources[resource.type].data.findIndex(item => item.id === resource.id) > -1;
  }

  return false;
};

const updateOrInsertResource = (state, resource) => {
  if (typeof resource !== 'object') {
    return state;
  }

  let newState = state;
  const updatePath = ['resources', resource.type, 'data'];

  if (stateContainsResource(state, resource)) {
    const resources = state.resources[resource.type].data;
    const idx = resources.findIndex(item => item.id === resource.id);

    const relationships = {};
    Object.keys(resource.relationships).forEach((relationship) => {
      if (!resource.relationships[relationship].data) {
        relationships[relationship] = resources[idx].relationships[relationship];
      }
    });
    Object.assign(resource.relationships, relationships);

    if (!equal(resources[idx], resource)) {
      newState = imm.set(newState, updatePath.concat(idx), resource);
    }
  } else {
    newState = imm.push(newState, updatePath, resource);
  }

  return newState;
};

export const removeResourceFromState = (state, resource) => {
  const index = state.resources[resource.type].data.findIndex(e => e.id === resource.id);
  const path = ['resources', resource.type, 'data', index];

  return imm(state).del(path);
};

export const updateOrInsertResourcesIntoState = (state, resources) => {
  return resources.reduce(updateOrInsertResource, state);
};

export const setIsInvalidatingForExistingResource = (state, { type, id }, value = null) => {
  const idx = state.resources[type].data.findIndex(e => e.id === id && e.type === type);
  const updatePath = ['resources', type, 'data', idx, 'isInvalidating'];

  return value === null
    ? imm(state).del(updatePath)
    : imm(state).set(updatePath, value);
};

export const ensureResourceTypeInState = (state, type) => {
  const path = ['resources', type, 'data'];
  return hasOwnProperties(state, ['resources', type])
    ? state
    : imm(state).set(path, []).value();
};
