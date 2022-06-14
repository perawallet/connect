import {useEffect} from "react";

import useOnWindowResize from "./useOnWindowResize";

/**
 * Creates a css variable `--vh` that is the calculated viewport height,
 * and updates it on window resize. This `--vh` value can be used instead of
 * default `vh` value to prevent layout issues on mobile devices
 * See: https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
 */
function useSetDynamicVhValue() {
  useEffect(() => {
    // This useEffect was added to make sure vh is set on mount (even if there is no window resize)
    setVhVariable();
  }, []);

  useOnWindowResize(() => {
    setVhVariable();
  });

  function setVhVariable() {
    // a vh unit is equal to 1% of the screen height
    // eslint-disable-next-line no-magic-numbers
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
  }
}

export default useSetDynamicVhValue;
