/**
 * Wait for a given amount of time
 * @param ms - Time in milliseconds (default: 30)
 * @returns A promise that resolves after the specified time
 * @example
 * await wait(1000); // Wait for 1 second
 * wait(2000).then(() => console.log('Done!')); // Wait for 2 seconds and then log
 *
 * @see https://stackoverflow.com/a/52357953
 */
export const wait = (ms = 30) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
/**
 * Alias for wait
 */
export const sleep = wait;
export const delay = wait;
