export default function parseExpectedGas(e: Error): Error {
  // parse a custom error generated by the BundlerHelper, which gives a hint of how much payment is missing
  const match = e.message?.match(/paid (\d+) expected (\d+)/);
  if (match != null) {
    const paid = Math.floor(parseInt(match[1]) / 1e9);
    const expected = Math.floor(parseInt(match[2]) / 1e9);
    return new Error(
      `Error: Paid ${paid}, expected ${expected} . Paid ${Math.floor(
        (paid / expected) * 100
      )}%, missing ${expected - paid} `
    );
  }
  return e;
}
