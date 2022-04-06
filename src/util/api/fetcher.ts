/**
 * Wrapper function for browser's fetch API.
 *
 * @param {string} url API URL
 * @param {RequestInit} config RequestInit object
 * @returns {any}
 */
function fetcher<T>(url: string, config: RequestInit = {}): Promise<T> {
  return fetch(url, config)
    .then((response) => response.json())
    .then((data) => data as T);
}

export default fetcher;
