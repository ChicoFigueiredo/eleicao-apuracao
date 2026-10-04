const base64UrlBytes = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const pemBytes = (pem: string) => Uint8Array.from(atob(pem.replace(/-----(BEGIN|END) PUBLIC KEY-----|\s/g, "")), (character) => character.charCodeAt(0));

/** Validates compact JWS (`header.payload.signature`) distributed by the TSE. */
export const verifiedJwsPayload = async (compactJws: string, publicKeyPem: string): Promise<unknown> => {
  const parts = compactJws.trim().split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) throw new Error("Envelope JWS compacto inválido.");
  let header: { alg?: string };
  try { header = JSON.parse(new TextDecoder().decode(base64UrlBytes(parts[0]))); }
  catch { throw new Error("Cabeçalho JWS inválido."); }
  if (header.alg !== "RS256") throw new Error(`Algoritmo JWS não suportado: ${header.alg ?? "ausente"}.`);
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey("spki", pemBytes(publicKeyPem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  } catch { throw new Error("Chave pública JWS inválida."); }
  const signatureValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!signatureValid) throw new Error("Assinatura JWS inválida.");
  try { return JSON.parse(new TextDecoder().decode(base64UrlBytes(parts[1]))); }
  catch { throw new Error("Payload JWS não contém JSON válido."); }
};

export const fetchVerifiedTseJson = async (url: string, publicKeyPem: string): Promise<unknown> => {
  const response = await fetch(url, { headers: { accept: "application/jose, application/json" } });
  if (!response.ok) throw new Error(`TSE respondeu HTTP ${response.status}.`);
  return verifiedJwsPayload(await response.text(), publicKeyPem);
};
