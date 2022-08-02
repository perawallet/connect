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

export {shuffleArray};
