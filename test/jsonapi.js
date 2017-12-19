/* global describe, it */
import { createAction } from 'redux-actions';
import expect from 'expect';
import {
  reducer,
  setAxiosConfig,
  hydrateStore,
  IS_DELETING,
  IS_UPDATING
} from '../src/jsonapi';

global.__API_HOST__ = 'example.com'; // eslint-disable-line no-underscore-dangle
global.__API_ENDPOINT__ = '/api'; // eslint-disable-line no-underscore-dangle

const apiCreated = createAction('API_CREATED');
const apiRead = createAction('API_READ');
const apiUpdated = createAction('API_UPDATED');
const apiDeleted = createAction('API_DELETED');

const apiWillUpdate = createAction('API_WILL_UPDATE');
const apiWillDelete = createAction('API_WILL_DELETE');

const apiUpdateFailed = createAction('API_UPDATE_FAILED');
const apiDeleteFailed = createAction('API_DELETE_FAILED');

const state = {
  endpoint: {
    axiosConfig: {}
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
      34: {
        type: 'transactions',
        id: '34',
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
      }
    }
  },
  status: {
    isCreating: 0,
    isReading: 0,
    isUpdating: 0,
    isDeleting: 0
  }
};

const stateWithoutUsersResource = {
  endpoint: {
    host: null,
    path: null,
    headers: {
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json'
    }
  },
  resources: {
    transactions: {
      34: {
        type: 'transactions',
        id: '34',
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
      }
    }
  },
  status: {
    isCreating: 0,
    isReading: 0,
    isUpdating: 0,
    isDeleting: 0
  }
};

const taskWithoutRelationship = {
  data: {
    type: 'tasks',
    id: '43',
    attributes: {
      name: 'ABC',
      createdAt: '2016-02-19T11:52:43+0000',
      updatedAt: '2016-02-19T11:52:43+0000'
    }
  }
};

const taskWithTransaction = {
  data: {
    type: 'tasks',
    id: '43',
    attributes: {
      name: 'ABC',
      createdAt: '2016-02-19T11:52:43+0000',
      updatedAt: '2016-02-19T11:52:43+0000'
    },
    relationships: {
      taskList: {
        data: {
          type: 'taskLists',
          id: '1'
        }
      },
      transaction: {
        data: {
          type: 'transactions',
          id: '34'
        }
      }
    },
    links: {
      self: 'http://localhost/tasks/43'
    }
  }
};

const taskWithTransactions = {
  type: 'tasks',
  id: '43',
  attributes: {
    name: 'ABC',
    createdAt: '2016-02-19T11:52:43+0000',
    updatedAt: '2016-02-19T11:52:43+0000'
  },
  relationships: {
    taskList: {
      data: {
        type: 'taskLists',
        id: '1'
      }
    },
    transaction: {
      data: [
        {
          type: 'transactions',
          id: '34'
        }
      ]
    }
  },
  links: {
    self: 'http://localhost/tasks/43'
  }
};

const transactionToDelete = {
  type: 'transactions',
  id: '34',
  attributes: {
    description: 'ABC',
    createdAt: '2016-02-12T13:34:01+0000',
    updatedAt: '2016-02-19T11:52:43+0000',
  },
  relationships: {
    task: {
      links: {
        self: 'http://localhost/transactions/34/relationships/task',
      },
    }
  },
  links: {
    self: 'http://localhost/transactions/34'
  }
};

const transactionWithTask = {
  ...transactionToDelete,
  relationships: {
    task: {
      data: {
        type: 'tasks',
        id: '43'
      }
    }
  }
};

const updatedUser = {
  data: {
    type: 'users',
    id: '1',
    attributes: {
      name: 'Sir John Doe'
    },
    relationships: {
      tasks: {
        data: null
      }
    }
  }
};

const multipleResources = {
  data: [
    taskWithTransaction.data,
  ],
  relationships: [
    taskWithTransaction.relationships
  ]
};

const readResponse = {
  data: [
    taskWithTransaction.data
  ]
};

const readResponseWithIncluded = {
  ...readResponse,
  included: [
    {
      type: 'transactions',
      id: '35',
      attributes: {
        description: 'DEF',
        createdAt: '2016-02-12T13:35:01+0000',
        updatedAt: '2016-02-19T11:52:43+0000',
      },
      relationships: {
        task: {
          data: null
        }
      },
      links: {
        self: 'http://localhost/transactions/35'
      }
    }
  ]
};

const responseDataWithSingleResource = {
  data: {
    type: 'companies',
    id: '1',
    attributes: {
      name: 'Dixie.io',
      slug: 'dixie.io',
      createdAt: '2016-04-08T08:42:45+0000',
      updatedAt: '2016-04-08T08:42:45+0000',
      role: 'bookkeeper'
    },
    relationships: {
      users: {
        data: [{
          type: 'users',
          id: '1'
        }]
      },
      employees: {
        data: [{
          type: 'users',
          id: '1'
        }]
      },
      bookkeepers: {
        data: [{
          type: 'users',
          id: '4'
        }]
      },
      bookkeeper_state: {
        data: {
          type: 'bookkeeper_state',
          id: '2'
        }
      }
    },
    links: {
      self: 'http://gronk.app/api/v1/companies/1'
    }
  },
  included: [{
    type: 'users',
    id: '1',
    attributes: {
      name: 'Ron Star',
      email: 'stefan+stefan+ronni-dixie.io-dixie.io@dixie.io',
      createdAt: '2016-04-08T08:42:45+0000',
      updatedAt: '2016-04-13T08:28:58+0000'
    },
    relationships: {
      companies: {
        data: [{
          type: 'companies',
          id: '1'
        }]
      }
    }
  }]
};

const responseDataWithOneToManyRelationship = {
  data: [
    {
      type: 'companies',
      id: '1',
      attributes: {
        name: 'Dixie.io',
        slug: 'dixie.io',
        createdAt: '2016-04-08T08:42:45+0000',
        updatedAt: '2016-04-08T08:42:45+0000'
      },
      relationships: {
        user: {
          data: {
            type: 'users',
            id: '1'
          }
        }
      },
      links: {
        self: 'http://gronk.app/api/v1/companies/1'
      }
    },
    {
      type: 'companies',
      id: '2',
      attributes: {
        name: 'Dixie.io',
        slug: 'dixie.io',
        createdAt: '2016-04-08T08:42:45+0000',
        updatedAt: '2016-04-08T08:42:45+0000'
      },
      relationships: {
        user: {
          data: {
            type: 'users',
            id: '1'
          }
        }
      },
      links: {
        self: 'http://gronk.app/api/v1/companies/2'
      }
    }
  ]
};

const payloadWithNonMatchingReverseRelationships = require('./payloads/withNonMatchingReverseRelationships.json');

describe('Hydration of store', () => {
  it('should automatically organize new resource in new key on state', () => {
    const updatedState = reducer(state, hydrateStore(taskWithoutRelationship));
    expect(updatedState.resources.tasks).toBeInstanceOf(Object);
  });

  it('should handle multiple resources', () => {
    const updatedState = reducer(state, hydrateStore(multipleResources));
    expect(updatedState.resources.tasks).toBeInstanceOf(Object);
  });
});

describe('Creation of new resources', () => {
  it('should automatically organize new resource in new key on state', () => {
    const updatedState = reducer(state, apiCreated(taskWithoutRelationship));
    expect(updatedState.resources.tasks).toBeInstanceOf(Object);
  });

  it('should handle multiple resources', () => {
    const updatedState = reducer(state, apiCreated(multipleResources));
    expect(updatedState.resources.tasks).toBeInstanceOf(Object);
  });
});

describe('Reading resources', () => {
  it('should append read resources to state', () => {
    const updatedState = reducer(state, apiRead(readResponse));
    expect(updatedState.resources.tasks).toBeInstanceOf(Object);
    expect(Object.keys(updatedState.resources.tasks).length).toEqual(1);
  });

  it('should append included resources in state', () => {
    const updatedState = reducer(state, apiRead(readResponseWithIncluded));
    expect(Object.keys(updatedState.resources.transactions).length).toEqual(Object.keys(state.resources.transactions).length + 1);
  });

  it('should handle response where data is an object', () => {
    const updatedState = reducer(undefined, apiRead(responseDataWithSingleResource));
    expect(updatedState.resources.users).toBeInstanceOf(Object);
    expect(updatedState.resources.companies).toBeInstanceOf(Object);
  });

  it('should handle response with a one to many relationship', () => {
    const updatedState = reducer(state, apiRead(responseDataWithOneToManyRelationship));
    expect(updatedState.resources.companies).toBeInstanceOf(Object);
  });

  it('should ignore reverse relationship with no matching resource', () => {
    const updatedState = reducer(state, apiRead(payloadWithNonMatchingReverseRelationships));

    payloadWithNonMatchingReverseRelationships.included
      .filter(resource => resource.type === 'reports')
      .forEach((payloadReport) => {
        const stateReport = updatedState.resources.reports[payloadReport.id];
        expect(stateReport.relationships.file.data.id).toEqual(payloadReport.relationships.file.data.id);
      });
  });
});

describe('Updating resources', () => {
  it('should update a resource', () => {
    const updatedState = reducer(state, apiUpdated({
      data: [{
        type: 'users',
        id: '2',
        attributes: {
          name: 'Jane Doe'
        },
        relationships: {
          companies: {
            data: null
          }
        }
      }]
    }));
    expect(updatedState.resources.users['2'].attributes.name).toEqual('Jane Doe');
  });

  it('should persist in state and preserve order', () => {
    const userId = updatedUser.data.id;
    const updatedState = reducer(state, apiUpdated(updatedUser));
    expect(state.resources.users[userId].attributes.name).not.toEqual(updatedUser.data.attributes.name);
    expect(updatedState.resources.users[userId].attributes.name).toEqual(updatedUser.data.attributes.name);
  });

  it('should be able to update a resource before type is in state', () => {
    const userToUpdate = state.resources.users[1];
    const stateWithResourceType = reducer(stateWithoutUsersResource, apiWillUpdate(userToUpdate));
    const updatedState = reducer(stateWithResourceType, apiUpdated(updatedUser));
    expect(updatedState.resources.users[1]).toEqual(updatedUser.data);
  });
});

describe('Delete resources', () => {
  it('should remove resource from state', () => {
    const updatedState = reducer(state, apiDeleted(transactionToDelete));
    expect(Object.keys(updatedState.resources.transactions).length).toEqual(0);
  });

  describe('when one-to-many relationship', () => {
    it('should update reverse relationship for transaction', () => {
      // Add task with transactions to state
      const stateWithTask = reducer(state, apiCreated({ data: taskWithTransactions }));
      expect(stateWithTask.resources.tasks).toEqual({ [taskWithTransactions.id]: taskWithTransactions });

      // Update relation between transaction and task
      const stateWithTaskWithTransaction = reducer(stateWithTask, apiUpdated({ data: transactionWithTask }));

      expect(stateWithTaskWithTransaction.resources.transactions[transactionWithTask.id].relationships.task.data.type).toEqual(taskWithTransactions.type);

      const stateWithoutTask = reducer(stateWithTask, apiDeleted(taskWithTransactions));
      const { data: relationship } = stateWithoutTask.resources.transactions[transactionWithTask.id].relationships.task;
      expect(relationship).toEqual(null);
    });
  });
});

describe('Endpoint values', () => {
  it('should update to provided axiosConfig', () => {
    const config = {
      headers: {
        Authorization: 'Bearer abcdef0123456789'
      }
    };
    expect(state.endpoint.axiosConfig).not.toEqual(config);
    const updatedState = reducer(state, setAxiosConfig(config));
    expect(updatedState.endpoint.axiosConfig).toEqual(config);
  });
});

describe('Invalidating flag', () => {
  it('should set before delete', () => {
    const updatedState = reducer(state, apiWillDelete(state.resources.users[1]));
    expect(updatedState.resources.users[1].isInvalidating).toEqual(IS_DELETING);
  });

  it('should set before update', () => {
    const updatedState = reducer(state, apiWillUpdate(state.resources.users[1]));
    expect(updatedState.resources.users[1].isInvalidating).toEqual(IS_UPDATING);
  });

  it('should be removed after update', () => {
    const updatedState = reducer(
      reducer(state, apiWillUpdate(state.resources.users[1])),
      apiUpdated({ data: state.resources.users[1] })
    );
    expect(updatedState.resources.users[1].isInvalidating).toBeFalsy();
  });

  it('should be removed after update failure', () => {
    const updatedState = reducer(
      reducer(state, apiWillUpdate(state.resources.users[1])),
      apiUpdateFailed({ resource: state.resources.users[1] })
    );
    expect(updatedState.resources.users[1].isInvalidating).toBeFalsy();
  });

  it('should be removed after delete failure', () => {
    const updatedState = reducer(
      reducer(state, apiWillDelete(state.resources.users[1])),
      apiDeleteFailed({ resource: state.resources.users[1] })
    );
    expect(updatedState.resources.users[1].isInvalidating).toBeFalsy();
  });
});

describe('status flags', () => {
  it('should update isUpdating status flag properly when update fails', () => {
    let updatedState = reducer(state, apiWillUpdate(state.resources.users[1]));
    expect(updatedState.status.isUpdating).toEqual(1);
    updatedState = reducer(updatedState, apiUpdateFailed({ resource: state.resources.users[1] }));
    expect(updatedState.status.isUpdating).toEqual(0);
  });

  it('should update isDeleting status flag properly when delete fails', () => {
    let updatedState = reducer(state, apiWillDelete(state.resources.users[1]));
    expect(updatedState.status.isDeleting).toEqual(1);
    updatedState = reducer(updatedState, apiDeleteFailed({ resource: state.resources.users[1] }));
    expect(updatedState.status.isDeleting).toEqual(0);
  });
});

const request1 = {
  data: [
    {
      type: 'articles',
      id: '1',
      attributes: {
        title: 'JSON API paints my bikeshed!',
        body: 'The shortest article. Ever.',
        created: '2015-05-22T14:56:29.000Z',
        updated: '2015-05-22T14:56:28.000Z'
      },
      relationships: {
        author: {
          data: {
            id: '42',
            type: 'people'
          }
        }
      }
    }
  ],
  included: [
    {
      type: 'people',
      id: '42',
      attributes: {
        name: 'John',
        age: 80,
        gender: 'male'
      },
      relationships: {
        articles: {},
        comments: {}
      }
    }
  ]
};

const request2 = {
  data: [
    {
      type: 'articles',
      id: '1',
      attributes: {
        title: 'JSON API paints my bikeshed!',
        body: 'The shortest article. Ever.',
        created: '2015-05-22T14:56:29.000Z',
        updated: '2015-05-22T14:56:28.000Z'
      },
      relationships: {
        author: {}
      }
    }
  ]
};

describe('Relationships without data key should not be reset', () => {
  it('should append read resources to state', () => {
    const updatedState = reducer(state, apiRead(request1));
    expect(updatedState.resources.articles).toBeInstanceOf(Object);
    expect(Object.keys(updatedState.resources.articles).length).toEqual(1);
    expect(updatedState.resources.articles[1].relationships.author).toEqual({ data: { id: '42', type: 'people' } });

    const updatedState2 = reducer(updatedState, apiRead(request2));
    expect(updatedState2.resources.articles).toBeInstanceOf(Object);
    expect(Object.keys(updatedState2.resources.articles).length).toEqual(1);
    expect(updatedState2.resources.articles[1].relationships.author).toEqual({ data: { id: '42', type: 'people' } });
  });
});
