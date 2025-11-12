import {fetchWithConfig} from './fetch';
export const GetRequest = (url = '', config = {}) => {
    return fetchWithConfig(url, { method: 'GET', ...config });
};

export const PostRequest = (url = '', body = {}, config = {}) => {
    return fetchWithConfig(url, { method: 'POST', body: JSON.stringify(body), ...config });
};

export const PutRequest = (url = '', body = {}, config = {}) => {
    return fetchWithConfig(url, { method: 'PUT', body: JSON.stringify(body), ...config });
};

export const DeleteRequest = (url = '', config = {}) => {
    return fetchWithConfig(url, { method: 'DELETE', ...config });
};