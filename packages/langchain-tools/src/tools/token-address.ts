import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// ─── Static table — only tokens verified from official sources ────────────────
// Sources: Uniswap token list, Circle USDC addresses, Chainlink docs, Aave docs
// chainId → symbol (lowercase) → address

const VERIFIED_TOKENS: Record<string, Record<string, string>> = {
  // ── Ethereum Mainnet (verified: etherscan + uniswap token list) ──────────
  "1": {
    eth:    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // native
    weth:   "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // etherscan verified
    usdc:   "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // circle.com/usdc
    usdt:   "0xdAC17F958D2ee523a2206206994597C13D831ec7", // tether.to
    dai:    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // makerdao
    wbtc:   "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // wbtc.network
    link:   "0x514910771AF9Ca656af840dff83E8264EcF986CA", // chain.link
    uni:    "0x1f9840a85d5aF5bf1D1762F925BDAaDdC4201F984",
    aave:   "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    steth:  "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", // lido.fi
    wsteth: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // lido.fi
  },

  // ── Ethereum Sepolia — testnet (verified: circle, uniswap, chainlink docs) ─
  "11155111": {
    eth:     "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:    "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // uniswap sepolia deployment
    usdc:    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // circle CCTP sepolia
    link:    "0x779877A7B0D9E8603169DdbD7836e478b4624789", // chainlink docs
    ccipbnm: "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05", // chainlink ccip docs
  },

  // ── Base Mainnet (verified: base.org token list) ───────────────────────────
  "8453": {
    eth:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:  "0x4200000000000000000000000000000000000006", // base canonical
    usdc:  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // circle base usdc
    cbeth: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", // coinbase
    dai:   "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    aero:  "0x940181a94A35A4569E4529A3CDfB74e38FD98631", // aerodrome
  },

  // ── Base Sepolia (verified: circle CCTP, base bridge docs) ────────────────
  "84532": {
    eth:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:  "0x4200000000000000000000000000000000000006",
    usdc:  "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // circle CCTP base sepolia
  },

  // ── Arbitrum One (verified: arbitrum bridge + uniswap) ────────────────────
  "42161": {
    eth:    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:   "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    usdc:   "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // native USDC (circle)
    "usdc.e":"0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // bridged USDC
    usdt:   "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    dai:    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    arb:    "0x912CE59144191C1204E64559FE8253a0e49E6548",
    wbtc:   "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    link:   "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
  },

  // ── Optimism (verified: optimism.io token list) ───────────────────────────
  "10": {
    eth:    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:   "0x4200000000000000000000000000000000000006",
    usdc:   "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // native USDC
    "usdc.e":"0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // bridged
    usdt:   "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    dai:    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    op:     "0x4200000000000000000000000000000000000042",
    wbtc:   "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
    link:   "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6",
  },

  // ── Polygon (verified: polygon.technology token list) ─────────────────────
  "137": {
    matic:  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    wmatic: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    usdc:   "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // native USDC
    "usdc.e":"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // bridged
    usdt:   "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    dai:    "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    weth:   "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    wbtc:   "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    link:   "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39",
  },

  // ── Avalanche C-Chain (verified: avax.network) ────────────────────────────
  "43114": {
    avax:  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    wavax: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    usdc:  "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // circle native
    usdt:  "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    weth:  "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    link:  "0x5947BB275c521040051D82396192181b413227A3",
  },

  // ── BNB Smart Chain (verified: bscscan.com) ───────────────────────────────
  "56": {
    bnb:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    wbnb:  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    usdc:  "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    usdt:  "0x55d398326f99059fF775485246999027B3197955",
    busd:  "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    weth:  "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    link:  "0x404460C6A5EdE2D891e8297795264fDe62ADBB75",
  },

  // ── Tempo testnet — KeeperHub MPP/x402 ───────────────────────────────────
  "4217": {
    "usdc.e": "0x20C000000000000000000000B9537D11c60E8b50",
  },
};

// CoinGecko chain ID → platform slug mapping
const COINGECKO_PLATFORM: Record<string, string> = {
  "1":     "ethereum",
  "8453":  "base",
  "42161": "arbitrum-one",
  "10":    "optimistic-ethereum",
  "137":   "polygon-pos",
  "43114": "avalanche",
  "56":    "binance-smart-chain",
  "59144": "linea",
  "1101":  "polygon-zkevm",
};

// Symbol aliases → canonical lowercase symbol
const ALIASES: Record<string, string> = {
  ethereum: "weth", ether: "weth",
  tether: "usdt", "tether usdt": "usdt",
  "usd coin": "usdc", "usd-coin": "usdc",
  "wrapped ether": "weth", "wrapped eth": "weth",
  "wrapped bitcoin": "wbtc", "wrapped btc": "wbtc",
  chainlink: "link",
  "wrapped bnb": "wbnb",
  "wrapped avax": "wavax", "wrapped avalanche": "wavax",
  "wrapped matic": "wmatic",
};

function canonicalSymbol(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return ALIASES[lower] ?? lower;
}

// ─── CoinGecko fallback ───────────────────────────────────────────────────────
// Free API, no key needed — rate limit: 30 req/min
async function lookupViaCoinGecko(
  symbol: string,
  chainId: string
): Promise<{ address: string; decimals: number; name: string } | null> {
  const platform = COINGECKO_PLATFORM[chainId];
  if (!platform) return null; // testnet or unsupported chain

  try {
    // Step 1: search for coin by symbol
    const searchUrl =
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as {
      coins?: Array<{ id: string; symbol: string; name: string }>;
    };

    // Find best match — symbol must match exactly (case-insensitive)
    const match = (searchData.coins ?? []).find(
      (c) => c.symbol.toLowerCase() === symbol.toLowerCase()
    );
    if (!match) return null;

    // Step 2: get platform addresses for that coin
    const coinUrl =
      `https://api.coingecko.com/api/v3/coins/${match.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;
    const coinRes = await fetch(coinUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!coinRes.ok) return null;

    const coinData = (await coinRes.json()) as {
      detail_platforms?: Record<string, { decimal_place: number; contract_address: string }>;
      name?: string;
    };

    const platformInfo = coinData.detail_platforms?.[platform];
    if (!platformInfo?.contract_address) return null;

    return {
      address: platformInfo.contract_address,
      decimals: platformInfo.decimal_place ?? 18,
      name: coinData.name ?? match.name,
    };
  } catch {
    return null; // network error or timeout — fail gracefully
  }
}

// ─── Tool ────────────────────────────────────────────────────────────────────

export function createTokenAddressTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_token_address",
    description:
      "Resolve a token symbol to its verified contract address on a given chain. " +
      "ALWAYS call this before keeperhub_generate_workflow when you need a token address — " +
      "never use symbol names as addresses (ETH_ADDRESS etc. will break the workflow). " +
      "First checks a verified static table (instant), then falls back to CoinGecko API " +
      "for any token not in the table — so any ERC-20 on mainnet chains works. " +
      "Returns address, decimals, source (static|coingecko), and a verify link. " +
      "Example: symbol='USDC', chainId='11155111' → 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    schema: z.object({
      symbol: z
        .string()
        .describe(
          "Token symbol. Examples: 'USDC', 'WETH', 'ETH', 'LINK', 'DAI', 'USDT', 'WBTC', 'ARB', 'OP'"
        ),
      chainId: z
        .string()
        .describe(
          "Chain ID as string. Examples: '1' (Ethereum), '11155111' (Sepolia), " +
          "'8453' (Base), '42161' (Arbitrum), '10' (Optimism), '137' (Polygon), " +
          "'43114' (Avalanche), '56' (BSC), '84532' (Base Sepolia)"
        ),
    }),
    func: async ({ symbol, chainId }) => {
      const sym = canonicalSymbol(symbol);
      const isTestnet = !COINGECKO_PLATFORM[chainId];

      // ── 1. Static table lookup (instant, zero API calls) ────────────────
      const staticAddress = VERIFIED_TOKENS[chainId]?.[sym];
      if (staticAddress) {
        const isNative = staticAddress === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        const decimals =
          sym === "usdc" || sym === "usdt" || sym === "usdc.e" ? 6
          : sym === "wbtc" ? 8
          : 18;
        const explorerBase = getExplorer(chainId);
        return JSON.stringify({
          ok: true,
          symbol: symbol.toUpperCase(),
          chainId,
          address: staticAddress,
          decimals,
          isNative,
          source: "static-verified",
          verify: isNative ? null : `${explorerBase}/token/${staticAddress}`,
        });
      }

      // ── 2. CoinGecko API fallback (mainnet chains only) ──────────────────
      if (!isTestnet) {
        const cg = await lookupViaCoinGecko(symbol, chainId);
        if (cg) {
          const explorerBase = getExplorer(chainId);
          return JSON.stringify({
            ok: true,
            symbol: symbol.toUpperCase(),
            chainId,
            address: cg.address,
            decimals: cg.decimals,
            name: cg.name,
            isNative: false,
            source: "coingecko",
            verify: `${explorerBase}/token/${cg.address}`,
            warning:
              "Address sourced from CoinGecko. Verify on the block explorer before using with large amounts.",
          });
        }
      }

      // ── 3. Not found — return helpful error ─────────────────────────────
      const available = Object.keys(VERIFIED_TOKENS[chainId] ?? {}).join(", ") || "none";
      const explorerBase = getExplorer(chainId);
      return JSON.stringify({
        ok: false,
        symbol,
        chainId,
        error: isTestnet
          ? `Token "${symbol}" not in verified testnet table for chain ${chainId}. ` +
            `Known tokens: ${available}. Find the address on ${explorerBase} and pass it directly.`
          : `Token "${symbol}" not found in static table or CoinGecko for chain ${chainId}. ` +
            `Known tokens: ${available}. Find the address on ${explorerBase} and pass it directly to generate_workflow.`,
        hint: `Search: ${explorerBase}/?q=${encodeURIComponent(symbol)}`,
      });
    },
  });
}

function getExplorer(chainId: string): string {
  const explorers: Record<string, string> = {
    "1":        "https://etherscan.io",
    "11155111": "https://sepolia.etherscan.io",
    "8453":     "https://basescan.org",
    "84532":    "https://sepolia.basescan.org",
    "42161":    "https://arbiscan.io",
    "421614":   "https://sepolia.arbiscan.io",
    "10":       "https://optimistic.etherscan.io",
    "137":      "https://polygonscan.com",
    "80002":    "https://amoy.polygonscan.com",
    "43114":    "https://snowtrace.io",
    "43113":    "https://testnet.snowtrace.io",
    "56":       "https://bscscan.com",
    "59144":    "https://lineascan.build",
    "4217":     "https://explorer.tempo.finance",
  };
  return explorers[chainId] ?? "https://etherscan.io";
}
