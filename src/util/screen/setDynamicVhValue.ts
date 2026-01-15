import {setVhVariable} from "./screenSizeUtils";

(function setDynamicVhValue() {
  // Call immediately if DOM is already loaded
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setVhVariable();
  } else {
    // Otherwise wait for DOMContentLoaded
    window.addEventListener("DOMContentLoaded", () => {
      setVhVariable();
    });
  }

  // Always set up resize listener
  window.addEventListener("resize", () => {
    setVhVariable();
  });
})();
