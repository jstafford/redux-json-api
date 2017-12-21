import { createAction, handleActions } from 'redux-actions';
import imm from 'object-path-immutable';

import {
  stateContainsResource,
  removeResourceFromState,
  updateOrInsertResourcesIntoState,
  setIsInvalidatingForExistingResource,
  ensureResourceTypeInState,
  updateOrCreateSortInState
} from './state-mutation';

import { apiRequest, getPaginationUrl, hasOwnProperties, safeGet } from './utils';
import {
  API_SET_AXIOS_CONFIG, API_HYDRATE, API_WILL_CREATE, API_CREATED, API_CREATE_FAILED, API_WILL_READ, API_READ, API_READ_FAILED, API_WILL_UPDATE, API_UPDATED, API_UPDATE_FAILED, API_WILL_DELETE, API_DELETED, API_DELETE_FAILED
} from './constants';

export { hasOwnProperties, safeGet };

// Resource isInvalidating values
export const IS_DELETING = 'IS_DELETING';
export const IS_UPDATING = 'IS_UPDATING';

// Action creators
export const setAxiosConfig = createAction(API_SET_AXIOS_CONFIG);

export const hydrateStore = createAction(API_HYDRATE);

const apiWillCreate = createAction(API_WILL_CREATE);
const apiCreated = createAction(API_CREATED);
const apiCreateFailed = createAction(API_CREATE_FAILED);

const apiWillRead = createAction(API_WILL_READ);
const apiRead = createAction(API_READ);
const apiReadFailed = createAction(API_READ_FAILED);

const apiWillUpdate = createAction(API_WILL_UPDATE);
const apiUpdated = createAction(API_UPDATED);
const apiUpdateFailed = createAction(API_UPDATE_FAILED);

const apiWillDelete = createAction(API_WILL_DELETE);
const apiDeleted = createAction(API_DELETED);
const apiDeleteFailed = createAction(API_DELETE_FAILED);

export const createResource = (resource) => {
  return (dispatch, getState) => {
    dispatch(apiWillCreate(resource));

    const { axiosConfig } = getState().api.endpoint;
    const options = {
      ...axiosConfig,
      method: 'POST',
      data: JSON.stringify({
        data: resource
      })
    };

    return new Promise((resolve, reject) => {
      apiRequest(resource.type, options).then((json) => {
        dispatch(apiCreated(json));
        resolve(json);
      }).catch((error) => {
        const err = error;
        err.resource = resource;

        dispatch(apiCreateFailed(err));
        reject(err);
      });
    });
  };
};

class ApiResponse {
  constructor(response, dispatch, nextUrl, prevUrl) {
    this.body = response;
    this.dispatch = dispatch;
    this.nextUrl = nextUrl;
    this.prevUrl = prevUrl;
  }

  /* eslint-disable */
  loadNext = () => this.dispatch(readEndpoint(this.nextUrl));

  loadPrev = () => this.dispatch(readEndpoint(this.prevUrl));
  /* eslint-enable */
}

export const readEndpoint = (endpoint) => {
  return (dispatch, getState) => {
    const state = getState().api;
    const pendingPromise = safeGet(state, ['pending', endpoint], null);
    if (pendingPromise) {
      return pendingPromise;
    }

    const { axiosConfig } = state.endpoint;

    const promise = new Promise((resolve, reject) => {
      apiRequest(endpoint, axiosConfig)
        .then((json) => {
          dispatch(apiRead({ endpoint, ...json }));

          const nextUrl = getPaginationUrl(json, 'next', axiosConfig.baseURL);
          const prevUrl = getPaginationUrl(json, 'prev', axiosConfig.baseURL);

          resolve(new ApiResponse(json, dispatch, nextUrl, prevUrl));
        })
        .catch((error) => {
          const err = error;
          err.endpoint = endpoint;

          dispatch(apiReadFailed(err));
          reject(err);
        });
    });

    dispatch(apiWillRead({ endpoint, promise }));
    return promise;
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
export const ensureResource = (type, id, include) => {
  return (dispatch, getState) => {
    const promises = [];
    const state = getState().api;
    if (!stateContainsResource(state, { type, id })) {
      const url = include ? `${type}/${id}?include=${include}` : `${type}/${id}`;
      const promise = dispatch(readEndpoint(url));
      promises.push(promise);
    } else if (include) {
      const resourceRels = state.resources[type][id].relationships;
      const includeRels = include.split(',');
      const missingResources = {};
      includeRels.forEach((includedRel) => {
        const includeList = resourceRels[includedRel].data;
        if (includeList) {
          includeList.forEach((item) => {
            if (!stateContainsResource(state, item)) {
              if (!missingResources[item.type]) {
                missingResources[item.type] = [];
              }
              missingResources[item.type].push(item.id);
            }
          });
        }
      });
      const missingTypes = Object.keys(missingResources);
      missingTypes.forEach((missingType) => {
        const missingIds = missingResources[missingType];
        if (missingIds.length) {
          let url = `${missingType}/?`;
          let and = '';
          missingIds.forEach((missingId) => {
            url += `${and}filter[id]=${missingId}`;
            and = '&';
          });
          const promise = dispatch(readEndpoint(url));
          promises.push(promise);
        }
      });
    }
    return Promise.all(promises);
  };
};

export const updateResource = (resource) => {
  return (dispatch, getState) => {
    dispatch(apiWillUpdate(resource));

    const { axiosConfig } = getState().api.endpoint;
    const endpoint = `${resource.type}/${resource.id}`;

    const options = {
      ...axiosConfig,
      method: 'PATCH',
      data: {
        data: resource
      }
    };

    return new Promise((resolve, reject) => {
      apiRequest(endpoint, options)
        .then((json) => {
          dispatch(apiUpdated(json));
          resolve(json);
        })
        .catch((error) => {
          const err = error;
          err.resource = resource;

          dispatch(apiUpdateFailed(err));
          reject(err);
        });
    });
  };
};

export const deleteResource = (resource) => {
  return (dispatch, getState) => {
    dispatch(apiWillDelete(resource));

    const { axiosConfig } = getState().api.endpoint;
    const endpoint = `${resource.type}/${resource.id}`;

    const options = {
      ...axiosConfig,
      method: 'DELETE'
    };

    return new Promise((resolve, reject) => {
      apiRequest(endpoint, options)
        .then(() => {
          dispatch(apiDeleted(resource));
          resolve();
        })
        .catch((error) => {
          const err = error;
          err.resource = resource;

          dispatch(apiDeleteFailed(err));
          reject(err);
        });
    });
  };
};

export const requireResource = (resourceType, endpoint = resourceType) => {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      const { api } = getState();
      if (Object.prototype.hasOwnProperty.call(api, resourceType)) {
        resolve();
      }

      dispatch(readEndpoint(endpoint))
        .then(resolve)
        .catch(reject);
    });
  };
};

// Reducers
export const reducer = handleActions({
  [API_SET_AXIOS_CONFIG]: (state, { payload: axiosConfig }) => {
    return imm(state).set(['endpoint', 'axiosConfig'], axiosConfig).value();
  },

  [API_HYDRATE]: (state, { payload: resources }) => {
    const entities = Array.isArray(resources.data) ? resources.data : [resources.data];

    const newState = updateOrInsertResourcesIntoState(
      state,
      entities.concat(resources.included || [])
    );

    return imm(newState).value();
  },

  [API_WILL_CREATE]: (state) => {
    return imm(state).set(['status', 'isCreating'], state.status.isCreating + 1).value();
  },

  [API_CREATED]: (state, { payload: resources }) => {
    const entities = Array.isArray(resources.data) ? resources.data : [resources.data];

    const newState = updateOrInsertResourcesIntoState(
      state,
      entities.concat(resources.included || [])
    );

    return imm(newState)
      .set(['status', 'isCreating'], state.status.isCreating - 1)
      .value();
  },

  [API_CREATE_FAILED]: (state) => {
    return imm(state).set(['status', 'isCreating'], state.status.isCreating - 1).value();
  },

  [API_WILL_READ]: (state, { payload }) => {
    return imm(state)
      .set(['status', 'isReading'], state.status.isReading + 1)
      .set(['pending', payload.endpoint], payload.promise)
      .value();
  },

  [API_READ]: (state, { payload }) => {
    const resources = (
      Array.isArray(payload.data)
        ? payload.data
        : [payload.data]
    ).concat(payload.included || []);

    let newState = updateOrInsertResourcesIntoState(state, resources);

    const selfLink = safeGet(payload, ['links', 'self'], null);
    if (selfLink && selfLink.indexOf('sort') >= 0) {
      newState = updateOrCreateSortInState(newState, payload);
    }

    return imm(newState)
      .set(['status', 'isReading'], state.status.isReading - 1)
      .del(['pending', payload.endpoint])
      .value();
  },

  [API_READ_FAILED]: (state, { payload }) => {
    return imm(state)
      .set(['status', 'isReading'], state.status.isReading - 1)
      .del(['pending', payload.endpoint])
      .value();
  },

  [API_WILL_UPDATE]: (state, { payload: resource }) => {
    const { type, id } = resource;

    const newState = ensureResourceTypeInState(state, type);

    return setIsInvalidatingForExistingResource(newState, { type, id }, IS_UPDATING)
      .set(['status', 'isUpdating'], state.status.isUpdating + 1)
      .value();
  },

  [API_UPDATED]: (state, { payload: resources }) => {
    const entities = Array.isArray(resources.data) ? resources.data : [resources.data];

    const newState = updateOrInsertResourcesIntoState(
      state,
      entities.concat(resources.included || [])
    );

    return imm(newState)
      .set(['status', 'isUpdating'], state.status.isUpdating - 1)
      .value();
  },

  [API_UPDATE_FAILED]: (state, { payload: { resource } }) => {
    const { type, id } = resource;

    return setIsInvalidatingForExistingResource(state, { type, id }, null)
      .set(['status', 'isUpdating'], state.status.isUpdating - 1)
      .value();
  },

  [API_WILL_DELETE]: (state, { payload: resource }) => {
    const { type, id } = resource;

    return setIsInvalidatingForExistingResource(state, { type, id }, IS_DELETING)
      .set(['status', 'isDeleting'], state.status.isDeleting + 1)
      .value();
  },

  [API_DELETED]: (state, { payload: resource }) => {
    return removeResourceFromState(state, resource)
      .set(['status', 'isDeleting'], state.status.isDeleting - 1)
      .value();
  },

  [API_DELETE_FAILED]: (state, { payload: { resource } }) => {
    const { type, id } = resource;

    return setIsInvalidatingForExistingResource(state, { type, id }, null)
      .set(['status', 'isDeleting'], state.status.isDeleting - 1)
      .value();
  }

}, {
  status: {
    isCreating: 0,
    isReading: 0,
    isUpdating: 0,
    isDeleting: 0
  },
  endpoint: {
    axiosConfig: {}
  },
  pending: {},
  resources: {},
  sorts: {}
});
