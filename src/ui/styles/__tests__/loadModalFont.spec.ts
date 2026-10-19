import { afterEach, describe, expect, it } from 'vitest'

import { loadModalFont } from '../loadModalFont.js'

function fontLinks() {
    return document.head.querySelectorAll<HTMLLinkElement>(
        'link#pera-wallet-connect-font',
    )
}

describe('loadModalFont', () => {
    afterEach(() => {
        fontLinks().forEach(link => link.remove())
    })

    it('adds the font stylesheet to the document head', () => {
        loadModalFont()

        const [link] = fontLinks()

        expect(link.rel).toBe('stylesheet')
        expect(link.href).toContain('fonts.googleapis.com')
    })

    it('adds it only once when several SDK copies load', () => {
        loadModalFont()
        loadModalFont()

        expect(fontLinks()).toHaveLength(1)
    })
})
