import axios from 'axios';
import createError from 'axios/lib/core/createError';
import imm from 'object-path-immutable';

export const jsonContentTypes = [
  'application/json',
  'application/vnd.api+json'
];

const hasValidContentType = response => jsonContentTypes.some(contentType => response.headers['content-type'].indexOf(contentType) > -1);

export const apiRequest = (url, options = {}) => {
  const allOptions = imm(options)
    .set('url', url)
    .set(['headers', 'Accept'], 'application/vnd.api+json')
    .set(['headers', 'Content-Type'], 'application/vnd.api+json')
    .value();

  return axios(allOptions)
    .then((res) => {
      if (res.status === 204) {
        return res;
      }

      if (hasValidContentType(res) === false) {
        throw createError(
          'Invalid Content-Type in response',
          res.config,
          null,
          res
        );
      }

      return res.data;
    });
};

export const hasOwnProperties = (obj, propertyTree) => {
  let curObj = obj;
  const propLen = propertyTree.length;
  for (let i = 0; i < propLen; i += 1) {
    if (!(curObj instanceof Object)) {
      return false;
    }
    const property = propertyTree[i];
    const hasProperty = Object.prototype.hasOwnProperty.call(curObj, property);
    if (!hasProperty) {
      return false;
    }
    curObj = curObj[property];
  }
  return true;
};

export const safeGet = (obj, path, defaultVal) => {
  let curObj = obj;
  const pathLen = path.length;
  for (let i = 0; i < pathLen; i += 1) {
    if (!(curObj instanceof Object)) {
      return defaultVal;
    }
    const property = path[i];
    const hasProperty = Object.prototype.hasOwnProperty.call(curObj, property);
    if (!hasProperty) {
      return defaultVal;
    }
    curObj = curObj[property];
  }
  return curObj;
};

export const getPaginationUrl = (response, direction, path) => {
  const paginationUrl = safeGet(response, ['links', direction], null);
  if (!paginationUrl) {
    return null;
  }

  return paginationUrl.replace(`${path}/`, '');
};
