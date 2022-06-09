import {useState, useEffect} from "react";

import {MEDIA_QUERIES} from "./mediaQueryHookConstants";

// Originated from : https://github.com/beautifulinteractions/beautiful-react-hooks/blob/master/src/useMediaQuery.js

function useMediaQuery(mediaQuery: string) {
  const isMatchMediaAPISupported = "matchMedia" in window;
  const [isMediaMatchingQuery, setIsMediaMatchingQuery] = useState(
    isMatchMediaAPISupported && Boolean(window.matchMedia(mediaQuery).matches)
  );

  useEffect(() => {
    let mediaQueryList: MediaQueryList;
    let mediaQueryListEventHandler: VoidFunction;

    if (isMatchMediaAPISupported) {
      mediaQueryList = window.matchMedia(mediaQuery);
      mediaQueryListEventHandler = function () {
        setIsMediaMatchingQuery(Boolean(mediaQueryList.matches));
      };

      if (mediaQueryList) {
        // Although addListener() is marked as deprecated, it is used here for backward compatibility (for example Safari 13)
        mediaQueryList.addListener(mediaQueryListEventHandler);
      }
    }

    return () => {
      if (isMatchMediaAPISupported && mediaQueryListEventHandler && mediaQueryList) {
        // Although removeListener() is marked as deprecated, it is used here for backward compatibility (for example Safari 13)
        mediaQueryList.removeListener(mediaQueryListEventHandler);
      }
    };
  }, [mediaQuery, isMatchMediaAPISupported]);

  return isMediaMatchingQuery;
}

function useIsSmallScreen() {
  return useMediaQuery(MEDIA_QUERIES.SMALL);
}

export default useMediaQuery;
export {useIsSmallScreen};
