import {
  MEDIUM_SCREEN_BREAKPOINT,
  SMALL_SCREEN_BREAKPOINT,
  XSMALL_SCREEN_BREAKPOINT
} from "./screenSizeConstants";

function isLargeScreen() {
  return document.documentElement.clientWidth >= MEDIUM_SCREEN_BREAKPOINT;
}

function isMediumScreen() {
  return document.documentElement.clientWidth <= MEDIUM_SCREEN_BREAKPOINT;
}

function isSmallScreen() {
  return document.documentElement.clientWidth <= SMALL_SCREEN_BREAKPOINT;
}

function isXSmallScreen() {
  return document.documentElement.clientWidth <= XSMALL_SCREEN_BREAKPOINT;
}

function setVhVariable() {
  // a vh unit is equal to 1% of the screen height
  // eslint-disable-next-line no-magic-numbers
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
}

export {isLargeScreen, isMediumScreen, isSmallScreen, isXSmallScreen, setVhVariable};
