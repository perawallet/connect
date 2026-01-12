/**
 * Shuffle the given array
 *
 * @param {T[]} items Array of items to be shuffled
 * @returns {T[]} shuffeled array of items
 */
function shuffleArray<T>(items: T[]) {
  const newItems = items.slice();

  for (let i = newItems.length - 1; i > 0; i--) {
    const randomNumber = Math.floor(Math.random() * (i + 1));

    [newItems[i], newItems[randomNumber]] = [newItems[randomNumber], newItems[i]];
  }

  return newItems;
}

/**
 * ConcatArrays takes n number arrays and returns a joint Uint8Array
 * @param arrs - An arbitrary number of n array-like number list arguments
 * @returns [a,b]
 */
function concatArrays(...arrs: ArrayLike<number>[]) {
  const size = arrs.reduce((sum, arr) => sum + arr.length, 0);
  const c = new Uint8Array(size);
  let offset = 0;

  for (let i = 0; i < arrs.length; i++) {
    c.set(arrs[i], offset);
    offset += arrs[i].length;
  }

  return c;
}


export {shuffleArray, concatArrays};
