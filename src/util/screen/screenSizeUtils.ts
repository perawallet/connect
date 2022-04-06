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

export {isLargeScreen, isMediumScreen, isSmallScreen, isXSmallScreen};
