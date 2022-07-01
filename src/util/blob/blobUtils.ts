function uint8ArrayToString(data: Uint8Array): string {
  return Buffer.from(data).toString();
}

export {uint8ArrayToString};
