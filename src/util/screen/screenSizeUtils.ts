// Mobile browsers count the collapsible URL bar in `100vh`; the modal sizes
// itself with `--pera-wallet-vh` instead so it never hides behind it.
function setVhVariable() {
    const vhUnit = window.innerHeight / 100

    document.documentElement.style.setProperty('--pera-wallet-vh', `${vhUnit}px`)
}

function setupDynamicVhValue() {
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', setVhVariable)
    } else {
        setVhVariable()
    }

    window.addEventListener('resize', setVhVariable)
}

export { setVhVariable, setupDynamicVhValue }
