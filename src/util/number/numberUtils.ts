function generateSimpleId(): number {
    const date = Date.now() * Math.pow(10, 3)
    const extra = Math.floor(Math.random() * Math.pow(10, 3))

    return date + extra
}

export { generateSimpleId }
