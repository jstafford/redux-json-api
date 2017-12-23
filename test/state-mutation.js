import expect from 'expect';
import { createAction } from 'redux-actions';

import {
  setIsInvalidatingForExistingResource,
  updateOrInsertResourcesIntoState,
  ensureResourceTypeInState,
  updateOrCreateSortInState
} from '../src/state-mutation';

import {
  reducer,
  IS_UPDATING
} from '../src/jsonapi';

import {
  apiState,
  patchedResource
} from './payloads/failingReverseRelationshipUpdate';

import topics from './payloads/topics.json';

const state = {
  endpoint: {
    host: null,
    path: null,
    headers: {
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json'
    }
  },
  resources: {
    users: {
      1: {
        type: 'users',
        id: '1',
        attributes: {
          name: 'John Doe'
        },
        relationships: {
          companies: {
            data: null
          }
        }
      },
      2: {
        type: 'users',
        id: '2',
        attributes: {
          name: 'Emily Jane'
        },
        relationships: {
          companies: {
            data: null
          }
        }
      }
    },
    transactions: {
      35: {
        type: 'transactions',
        id: '35',
        attributes: {
          description: 'ABC',
          createdAt: '2016-02-12T13:34:01+0000',
          updatedAt: '2016-02-19T11:52:43+0000',
        },
        relationships: {
          task: {
            data: null
          }
        },
        links: {
          self: 'http://localhost/transactions/34'
        }
      },
      36: {
        type: 'transactions',
        id: '36',
        attributes: {
          description: 'ABC',
          createdAt: '2016-02-12T13:34:01+0000',
          updatedAt: '2016-02-19T11:52:43+0000',
        },
        relationships: {
          task: {
            data: null
          }
        },
        links: {
          self: 'http://localhost/transactions/34'
        }
      },
      37: {
        type: 'transactions',
        id: '37',
        attributes: {
          description: 'ABC',
          createdAt: '2016-02-12T13:34:01+0000',
          updatedAt: '2016-02-19T11:52:43+0000',
        },
        relationships: {
          task: {
            data: {
              type: 'tasks',
              id: '43'
            }
          }
        },
        links: {
          self: 'http://localhost/transactions/34'
        }
      }
    },
  },
  status: {
    isCreating: 0,
    isReading: 0,
    isUpdating: 0,
    isDeleting: 0
  },
  sorts: {}
};

describe('[State mutation] Insertion of resources', () => {
  it('should read and insert all resources into state', () => {
    const updatedState = updateOrInsertResourcesIntoState(state, topics.data);

    expect(Object.keys(updatedState.resources.topics).length).toEqual(topics.data.length);
  });
});

describe('[State mutation] Insertion of empty resources type', () => {
  it('should insert empty resources type into state', () => {
    const resourcesType = 'newResourcesType';
    const updatedState = ensureResourceTypeInState(state, resourcesType);

    expect(Object.keys(updatedState.resources[resourcesType]).length).toEqual(0);
  });

  it('should not mutate state if resources type exists', () => {
    const resourcesType = 'users';
    const updatedState = ensureResourceTypeInState(state, resourcesType);

    expect(updatedState.resources[resourcesType]).toEqual(state.resources[resourcesType]);
  });
});

describe('[State Mutation] Update or Reverse relationships', () => {
  it('should not duplicate existing reverse relationships', () => {
    const apiUpdated = createAction('API_UPDATED');
    const updatedState = reducer(apiState, apiUpdated(patchedResource));

    expect(updatedState.resources.zenAccounts[19].relationships.expenseItems.data.length).toEqual(1);
  });
});


describe('[State Mutation]: Set is invalidating for existing resource', () => {
  it('Should set a ivalidating type for resource to IS_UPDATING', () => {
    const { id, type } = state.resources.users[1];
    const updatedState = setIsInvalidatingForExistingResource(
      state,
      { type, id },
      IS_UPDATING
    ).value();
    expect(updatedState.resources.users[1].isInvalidating).toEqual(IS_UPDATING);
  });
});

describe('[State Mutation]: Create new reference when Object is mutated', () => {
  it('Should keep proper refrences when setting isInvalidating', () => {
    const { id, type } = state.resources.users[1];
    const updatedState = setIsInvalidatingForExistingResource(
      state,
      { type, id },
      IS_UPDATING
    ).value();

    expect(updatedState.resources.users[1]).not.toBe(state.resources.users[1]);
    expect(updatedState.resources.users[2]).toBe(state.resources.users[2]);
  });

  it('Should only replace updated resource', () => {
    const updatedState = updateOrInsertResourcesIntoState(state, [{
      type: 'users',
      id: '1',
      attributes: {
        name: 'Mr. John Doe'
      },
      relationships: {
        companies: {
          data: null
        }
      }
    }]);

    expect(updatedState.resources.users[1]).not.toBe(state.resources.users[1]);
    expect(updatedState.resources.users[2]).toBe(state.resources.users[2]);
  });

  it('Should keep object reference on update or insert when resource hasn\'t changed', () => {
    const updatedState = updateOrInsertResourcesIntoState(state, [{
      type: 'users',
      id: '1',
      attributes: {
        name: 'John Doe'
      },
      relationships: {
        companies: {
          data: null
        }
      }
    }]);

    expect(updatedState.resources.users[1]).toBe(state.resources.users[1]);
  });
});

describe('[State Mutation]: Create and update sorts', () => {
  it('Should save the ordered resource ids', () => {
    const updatedState = updateOrCreateSortInState(state, {
      meta: {
        page: {
          offset: 0,
          limit: 50,
          total: 4
        }
      },
      links: {
        self: 'http://localhost/jsonapi/transactions/?sort=customer&filter%5Breason%5D=refund'
      },
      data: [{
        type: 'transactions',
        id: '12',
        attributes: {
          customer: 'Alpha Corp',
          reason: 'refund'
        }
      }, {
        type: 'transactions',
        id: '34',
        attributes: {
          customer: 'Beta Center',
          reason: 'refund'
        }
      }, {
        type: 'transactions',
        id: '56',
        attributes: {
          customer: 'Delta Farms',
          reason: 'refund'
        }
      }, {
        type: 'transactions',
        id: '67',
        attributes: {
          customer: 'Epsilon, Inc',
          reason: 'refund'
        }
      }]
    });

    expect(updatedState.sorts.transactions).toBeInstanceOf(Object);
    expect(updatedState.sorts.transactions['sort=customer&filter%5Breason%5D=refund']).toBeInstanceOf(Object);
    expect(updatedState.sorts.transactions['sort=customer&filter%5Breason%5D=refund'].ids).toBeInstanceOf(Array);
    expect(updatedState.sorts.transactions['sort=customer&filter%5Breason%5D=refund'].ids).toEqual([
      '12', '34', '56', '67'
    ]);
    expect(updatedState.sorts.transactions['sort=customer&filter%5Breason%5D=refund'].total).toEqual(4);
  });
});
