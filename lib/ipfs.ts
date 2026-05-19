/**
 * lib/ipfs.ts
 *
 * Pinata IPFS upload/fetch utilities.
 * Server-side only — requires PINATA_JWT.
 */

import axios from "axios";

const PINATA_API = "https://api.pinata.cloud";
const PINATA_GATEWAY =
  process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud";

function getPinataJWT(): string {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT environment variable is not set");
  return jwt;
}

export interface PinataUploadResult {
  cid: string;
  url: string;
}

/**
 * Uploads a JSON object to Pinata IPFS.
 * @param data     The JSON-serialisable object to pin
 * @param name     Human-readable name for the pin
 * @returns        CID and public gateway URL
 */
export async function uploadJSONToIPFS(
  data: Record<string, unknown>,
  name: string
): Promise<PinataUploadResult> {
  const jwt = getPinataJWT();

  const response = await axios.post(
    `${PINATA_API}/pinning/pinJSONToIPFS`,
    {
      pinataContent: data,
      pinataMetadata: { name },
    },
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const cid = response.data.IpfsHash as string;
  return {
    cid,
    url: `${PINATA_GATEWAY}/ipfs/${cid}`,
  };
}

/**
 * Fetches JSON data from IPFS via Pinata gateway.
 * @param cid  The IPFS CID to fetch
 */
export async function fetchFromIPFS<T = Record<string, unknown>>(
  cid: string
): Promise<T> {
  const url = `${PINATA_GATEWAY}/ipfs/${cid}`;
  const response = await axios.get<T>(url, { timeout: 15000 });
  return response.data;
}

/**
 * Unpins a CID from Pinata (cleanup utility).
 */
export async function unpinFromIPFS(cid: string): Promise<void> {
  const jwt = getPinataJWT();
  await axios.delete(`${PINATA_API}/pinning/unpin/${cid}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}
