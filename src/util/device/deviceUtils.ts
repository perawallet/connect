import Bowser from "bowser";

function isNavigatorAvailable() {
  return typeof navigator !== "undefined";
}

function isAndroid() {
  return isNavigatorAvailable() && /Android/i.test(navigator.userAgent);
}

function isIOS() {
  return isNavigatorAvailable() && /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isNavigatorAvailable() && /iPhone|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Detects the browser name
 * @returns {BrowserName} Browser name
 */
function detectBrowser() {
  if (!isNavigatorAvailable()) {
    return null;
  }

  const {userAgent} = navigator;
  let browserName: string;

  if (userAgent.match(/DuckDuckGo/i)) {
    browserName = "DuckDuckGo";
  } else if (userAgent.match(/OPX/i)) {
    browserName = "Opera GX";
  }
  // @ts-ignore brave object exists on Brave
  else if (navigator.brave) {
    browserName = "Brave";
  } else {
    browserName = Bowser.getParser(navigator.userAgent).getBrowserName();
  }

  return browserName;
}

export {isAndroid, isIOS, isMobile, detectBrowser};
