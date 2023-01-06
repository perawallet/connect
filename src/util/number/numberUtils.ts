function generateSimpleId(): number {
  /* eslint-disable no-magic-numbers */
  const date = Date.now() * Math.pow(10, 3);
  const extra = Math.floor(Math.random() * Math.pow(10, 3));
  /* eslint-enable no-magic-numbers */

  return date + extra;
}

export {generateSimpleId};
