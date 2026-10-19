import { afterEach, describe, expect, it } from 'vitest'

import { setupDynamicVhValue, setVhVariable } from '../screenSizeUtils'

function setInnerHeight(height: number) {
    Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: height,
    })
}

function readVhVariable() {
    return document.documentElement.style.getPropertyValue('--pera-wallet-vh')
}

describe('screenSizeUtils', () => {
    afterEach(() => {
        document.documentElement.style.removeProperty('--pera-wallet-vh')
    })

    describe('setVhVariable', () => {
        it('sets --pera-wallet-vh to one percent of the window height', () => {
            setInnerHeight(800)

            setVhVariable()

            expect(readVhVariable()).toBe('8px')
        })
    })

    describe('setupDynamicVhValue', () => {
        it('sets the variable at once and follows window resizes', () => {
            setInnerHeight(600)

            setupDynamicVhValue()

            expect(readVhVariable()).toBe('6px')

            setInnerHeight(1000)
            window.dispatchEvent(new Event('resize'))

            expect(readVhVariable()).toBe('10px')
        })
    })
})
