import {setVhVariable} from "./screenSizeUtils";

(function setDynamicVhValue() {
  window.addEventListener("DOMContentLoaded", () => {
    setVhVariable();
  });

  window.addEventListener("resize", () => {
    setVhVariable();
  });
})();
