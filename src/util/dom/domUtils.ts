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

      resolve(newWindow);
    } catch (error) {
      reject(error);
    }
  });
}

export {getMetaInfo, getFavicons, waitForElementCreatedAtShadowDOM, waitForTabOpening};
