import appTellerManager, {PeraTeller} from "../network/teller/appTellerManager";
import PeraWalletConnectError from "../PeraWalletConnectError";

export const WAIT_FOR_TAB_TRY_INTERVAL = 700;
export const WAIT_FOR_TAB_MAX_TRY_COUNT = 50;

function getMetaInfo() {
  const metaTitle: HTMLElement | null = document.querySelector('meta[name="name"]');
  const metaDescription: HTMLElement | null = document.querySelector(
    'meta[name="description"]'
  );
  let {title} = document;
  let description = "";

  if (metaTitle instanceof HTMLMetaElement) {
    title = metaTitle.content;
  }

  if (metaDescription instanceof HTMLMetaElement) {
    description = metaDescription.content;
  }

  return {
    title,
    description,
    url: window.location.origin,
    favicon: getFavicons()[0]
  };
}

function getFavicons() {
  const links = document.getElementsByTagName("link");
  const icons = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];

    const rel = link.getAttribute("rel");

    if (rel && rel.toLowerCase().indexOf("icon") > -1) {
      const href = link.getAttribute("href");

      if (
        href &&
        href.toLowerCase().indexOf("https:") === -1 &&
        href.toLowerCase().indexOf("http:") === -1 &&
        href.indexOf("//") !== 0
      ) {
        let absoluteHref = `${window.location.protocol}//${window.location.host}`;

        if (href.indexOf("/") === 0) {
          absoluteHref += href;
        } else {
          const path = window.location.pathname.split("/");

          path.pop();

          const finalPath = path.join("/");

          absoluteHref += `${finalPath}/${href}`;
        }

        icons.push(absoluteHref);
      } else if (href?.indexOf("//") === 0) {
        const absoluteUrl = window.location.protocol + href;

        icons.push(absoluteUrl);
      } else if (href) {
        icons.push(href);
      }
    }
  }

  return icons;
}

function waitForElementCreatedAtShadowDOM(
  element: Element,
  className: string
): Promise<Element> {
  // eslint-disable-next-line consistent-return
  return new Promise<Element>((resolve) => {
    const waitedElement = element.shadowRoot?.querySelector(`.${className}`);

    if (waitedElement) {
      return resolve(waitedElement);
    }

    const observer = new MutationObserver(() => {
      if (waitedElement) {
        resolve(waitedElement);
        observer.disconnect();
      }
    });

    observer.observe(element, {
      childList: true,
      subtree: true
    });
  });
}

function waitForTabOpening(url: string): Promise<Window | null> {
  return new Promise((resolve, reject) => {
    try {
      const newWindow = window.open(url, "_blank");

      let count = 0;

      const checkTabIsOpened = setInterval(() => {
        count += 1;

        if (count === WAIT_FOR_TAB_MAX_TRY_COUNT) {
          clearInterval(checkTabIsOpened);
          reject(
            new PeraWalletConnectError(
              {
                type: "MESSAGE_NOT_RECEIVED"
              },

              "Couldn't open Pera Wallet, please try again."
            )
          );
          return;
        }

        if (newWindow) {
          if (newWindow.closed === true) {
            clearInterval(checkTabIsOpened);
            reject(
              new PeraWalletConnectError(
                {
                  type: "OPERATION_CANCELLED"
                },

                "Operation cancelled by user"
              )
            );
          }

          appTellerManager.sendMessage({
            message: {
              type: "TAB_OPEN"
            },

            origin: url,
            targetWindow: newWindow
          });
        }
      }, WAIT_FOR_TAB_TRY_INTERVAL);

      appTellerManager.setupListener({
        onReceiveMessage: (newTabEvent: MessageEvent<TellerMessage<PeraTeller>>) => {
          if (newTabEvent.data.message.type === "TAB_OPEN_RECEIVED") {
            clearInterval(checkTabIsOpened);
            resolve(newWindow);
          }
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

export {getMetaInfo, getFavicons, waitForElementCreatedAtShadowDOM, waitForTabOpening};
