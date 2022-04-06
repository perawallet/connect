function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export {isAndroid, isMobile};
