async function fetcher<T>(url: string, config: RequestInit = {}): Promise<T> {
    const response = await fetch(url, config)

    if (!response.ok) {
        throw new Error(`${url} answered ${response.status}`)
    }

    return (await response.json()) as T
}

export { fetcher }
