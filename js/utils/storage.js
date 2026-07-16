/**
/**
 * URL query parameter storage utility for saving and sharing calculator state.
 * @module utils/storage
 */

/**
 * Encode current input values to URL query parameters.
 * @param {Object} inputs - The input states to serialize.
 * @returns {string} Fully qualified URL string with query parameters.
 */
export function getShareURL(inputs) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(inputs)) {
    if (value !== null && value !== undefined) {
      params.set(key, String(value));
    }
  }

  url.search = params.toString();
  return url.toString();
}

/**
 * Decode query parameters from the current URL.
 * @returns {Object} Map of input parameter names to decoded values.
 */
export function decodeParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};

  for (const [key, value] of params.entries()) {
    // Try to parse numbers, booleans, or fall back to string
    if (value === "true") {
      result[key] = true;
    } else if (value === "false") {
      result[key] = false;
    } else if (!isNaN(Number(value)) && value.trim() !== "") {
      result[key] = Number(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
