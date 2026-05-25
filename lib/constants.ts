/**
 * Application-wide constants for PrivateStream Mezo.
 * All blockchain-specific values are sourced from environment variables.
 */

export const APP_NAME = "PrivateStream Mezo";
export const APP_DESCRIPTION =
  "Privacy-preserving encrypted video access platform on Mezo";

// ── Blockchain ──────────────────────────────────────────────────────────────
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 31611;
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://rpc.test.mezo.org";
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

// ── Platform Economics ───────────────────────────────────────────────────────
export const REVENUE_CAP_USD = Number(process.env.REVENUE_CAP_USD) || 20;
export const PLATFORM_FEE_PERCENTAGE =
  Number(process.env.PLATFORM_FEE_PERCENTAGE) || 10;
export const BTC_USD_FALLBACK = Number(process.env.BTC_USD_FALLBACK) || 100000;

// ── IPFS ─────────────────────────────────────────────────────────────────────
export const PINATA_GATEWAY =
  process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud";

// ── Access ───────────────────────────────────────────────────────────────────
export const DEFAULT_ACCESS_DURATION_SECONDS = 86400; // 24 hours
export const MIN_ACCESS_DURATION_SECONDS = 3600;      // 1 hour
export const MAX_ACCESS_DURATION_SECONDS = 2592000;   // 30 days

// ── Mezo Testnet chain config (for wagmi) ────────────────────────────────
export const MEZO_TESTNET = {
  id: 31611,
  name: "Mezo Testnet",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public:  { http: [RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "Mezo Explorer",
      url: "https://explorer.test.mezo.org",
    },
  },
  testnet: true,
} as const;

// ── Contract ABI (minimal — only what the frontend needs) ────────────────────
export const CONTRACT_ABI = [
  // Read
  "function getCampaign(uint256 campaignId) view returns (tuple(uint256 id, address creator, string metadataCID, uint256 priceWei, uint256 durationSeconds, uint256 totalRevenueWei, bool active, bool soldOut))",
  "function hasAccess(uint256 campaignId, address buyer) view returns (bool valid, uint256 expiresAt)",
  "function hasCampaign(address) view returns (bool)",
  "function creatorCampaignId(address) view returns (uint256)",
  "function totalCampaigns() view returns (uint256)",
  "function revenueCapWei() view returns (uint256)",
  "function platformFeeBps() view returns (uint256)",
  // Write
  "function createCampaign(string metadataCID, uint256 priceWei, uint256 durationSeconds) returns (uint256)",
  "function purchaseAccess(uint256 campaignId) payable",
  "function deactivateCampaign(uint256 campaignId)",
  // Events
  "event CampaignCreated(uint256 indexed campaignId, address indexed creator, string metadataCID, uint256 priceWei, uint256 durationSeconds)",
  "event AccessPurchased(uint256 indexed campaignId, address indexed buyer, uint256 amount, uint256 expiresAt)",
  "event RevenueCapReached(uint256 indexed campaignId, uint256 totalRevenue)",
] as const;
