import { vi } from 'vitest'

/** Lets pending promise chains and zero-delay tasks run, under either clock. */
async function tick() {
    if (vi.isFakeTimers()) {
        await vi.advanceTimersByTimeAsync(0)
    } else {
        await new Promise(resolve => setTimeout(resolve, 0))
    }
}

/** Ticks until `predicate` holds; fails fast instead of hanging the suite. */
async function waitFor(predicate: () => unknown, maxTicks = 50) {
    for (let i = 0; i < maxTicks; i++) {
        if (predicate()) {
            return
        }

        await tick()
    }

    throw new Error(`waitFor: condition not met after ${maxTicks} ticks`)
}

export { tick, waitFor }
