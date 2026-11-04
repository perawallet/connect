// Each modal component renders into its own shadow root, so the page's CSS
// cannot restyle it and its CSS cannot leak into the page.
function appendTemplateWithStyles(
    shadowRoot: ShadowRoot,
    template: HTMLTemplateElement,
    styles: string,
) {
    const styleSheet = document.createElement('style')

    styleSheet.textContent = styles

    shadowRoot.append(template.content.cloneNode(true), styleSheet)
}

export { appendTemplateWithStyles }
