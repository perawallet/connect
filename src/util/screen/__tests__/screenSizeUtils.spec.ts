import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupDynamicVhValue, setVhVariable } from '../screenSizeUtils.js'

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
        vi.restoreAllMocks()
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

        it('waits for DOMContentLoaded while the document is still loading', () => {
            vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
            setInnerHeight(700)

            setupDynamicVhValue()

            expect(readVhVariable()).toBe('')

            window.dispatchEvent(new Event('DOMContentLoaded'))

            expect(readVhVariable()).toBe('7px')
        })
    })
})
