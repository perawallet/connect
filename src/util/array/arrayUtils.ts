// Fisher–Yates; returns a shuffled copy.
function shuffleArray<T>(items: T[]) {
    const newItems = items.slice()

    for (let i = newItems.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1))

        ;[newItems[i], newItems[randomIndex]] = [
            newItems[randomIndex],
            newItems[i],
        ]
    }

    return newItems
}

function concatArrays(...arrays: ArrayLike<number>[]) {
    const result = new Uint8Array(
        arrays.reduce((size, array) => size + array.length, 0),
    )
    let offset = 0

    for (const array of arrays) {
        result.set(array, offset)
        offset += array.length
    }

    return result
}

export { shuffleArray, concatArrays }
