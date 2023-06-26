export default function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const standardBase64 = urlBase64ToBase64(base64);
  const binary = window.atob(standardBase64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function urlBase64ToBase64(input: string): string {
  // Replace url-safe characters with standard Base64 characters
  let output = input.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if it's missing
  const pad = output.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error("Invalid length for a Base64 string.");
    }
    output += new Array(5 - pad).join("=");
  }

  return output;
}
