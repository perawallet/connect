// jsdom has no transient user activation, which the Pera extension requires
// for a first-time connect. `clickAsUser` grants it for exactly the duration
// of the click's synchronous dispatch, so a provider call deferred past an
// `await` loses it, as it would in a browser.

let isClickInProgress = false

function clickAsUser(element: HTMLElement) {
    isClickInProgress = true

    try {
        element.click()
    } finally {
        isClickInProgress = false
    }
}

function hasTransientUserActivation() {
    return isClickInProgress
}

export { clickAsUser, hasTransientUserActivation }
