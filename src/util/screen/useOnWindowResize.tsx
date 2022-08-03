import {useEffect, useRef} from "react";

const DEFAULT_DEBOUNCE_TIME = 150;

const DEFAULT_OPTIONS = {
  /* Discard emitted resize events that take less than the specified time */
  debounceTime: DEFAULT_DEBOUNCE_TIME
};

function useOnWindowResize(callback: VoidFunction, options = DEFAULT_OPTIONS) {
  const timeoutId = useRef<any>(undefined);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId.current);
    };

    function handleResize() {
      if (!timeoutId.current) {
        timeoutId.current = setTimeout(() => {
          callbackRef.current();
          timeoutId.current = undefined;
        }, options.debounceTime);
      }
    }
  }, [options.debounceTime]);
}

export default useOnWindowResize;
