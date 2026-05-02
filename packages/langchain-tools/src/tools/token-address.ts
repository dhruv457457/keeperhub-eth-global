import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// ─── Token address lookup table ───────────────────────────────────────────────
// chainId → symbol (lowercase) → address
// Covers all 19 KeeperHub-supported chains with the most-used tokens

const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  // ── Ethereum Mainnet ─────────────────────────────────────────────────────
  "1": {
    eth:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    usdc:  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdt:  "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    dai:   "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    wbtc:  "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    link:  "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    uni:   "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    aave:  "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    crv:   "0xD533a949740bb3306d119CC777fa900bA034cd52",
    steth: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    wsteth:"0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    ldo:   "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
    cbeth: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
    comp:  "0xc00e94Cb662C3520282E6f5717214004A7f26888",
    mkr:   "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",
    pendle:"0x808507121B80c02388fAd14726482e061B8da827",
  },

  // ── Ethereum Sepolia (testnet) ─────────────────────────────────────────
  "11155111": {
    eth:    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:   "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    usdc:   "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    link:   "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    // Aave V3 Sepolia aTokens / underlyings
    aaveusdc: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
    aaveweth: "0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9A",
    // CCIP BnM (test bridge token)
    ccipbnm: "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05",
    ccipLnm: "0x466D489b6d36E7E3b824ef491C225F5830Be2CA2",
  },

  // ── Base Mainnet ──────────────────────────────────────────────────────
  "8453": {
    eth:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:  "0x4200000000000000000000000000000000000006",
    usdc:  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    cbeth: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
    dai:   "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    aero:  "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    well:  "0xA88594D404727625A9437C3f886C7643872296AE",
    tbtc:  "0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b",
    comp:  "0x9e1028F5F1D5eDE59748FFceE5532509976840E0",
    link:  "0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196",
  },

  // ── Base Sepolia (testnet) ────────────────────────────────────────────
  "84532": {
    eth:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:  "0x4200000000000000000000000000000000000006",
    usdc:  "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    ccipbnm: "0x88A2d74F47a237a62e7A51cdDa67270CE381555e",
  },

  // ── Arbitrum One ──────────────────────────────────────────────────────
  "42161": {
    eth:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    usdc:  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    "usdc.e": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    usdt:  "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    dai:   "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    arb:   "0x912CE59144191C1204E64559FE8253a0e49E6548",
    wbtc:  "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    link:  "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    gmx:   "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    magic: "0x539bdE0d7Dbd336b79148AA742883198BBF60342",
    pendle:"0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
  },

  // ── Arbitrum Sepolia (testnet) ────────────────────────────────────────
  "421614": {
    eth:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:  "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    usdc:  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    link:  "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
    ccipbnm: "0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D",
  },

  // ── Optimism ──────────────────────────────────────────────────────────
  "10": {
    eth:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:  "0x4200000000000000000000000000000000000006",
    usdc:  "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    "usdc.e": "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    usdt:  "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    dai:   "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    op:    "0x4200000000000000000000000000000000000042",
    wbtc:  "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
    link:  "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6",
    snx:   "0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4",
  },

  // ── Polygon Mainnet ───────────────────────────────────────────────────
  "137": {
    matic: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    wmatic:"0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    usdc:  "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    "usdc.e":"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    usdt:  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    dai:   "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    weth:  "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    wbtc:  "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    link:  "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39",
    aave:  "0xD6DF932A45C0f255f85145f286eA0b292B21C90B",
  },

  // ── Polygon Amoy (testnet) ─────────────────────────────────────────
  "80002": {
    matic: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    wmatic:"0x0ae690AAD8663aab12a671A6A0d74242332de85f",
    usdc:  "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    link:  "0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904",
  },

  // ── Avalanche C-Chain ─────────────────────────────────────────────────
  "43114": {
    avax:  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    wavax: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    usdc:  "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    usdt:  "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    dai:   "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    weth:  "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    link:  "0x5947BB275c521040051D82396192181b413227A3",
    joe:   "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
  },

  // ── Avalanche Fuji (testnet) ──────────────────────────────────────────
  "43113": {
    avax:  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    wavax: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c",
    usdc:  "0x5425890298aed601595a70AB815c96711a31Bc65",
    link:  "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    ccipbnm: "0xD21341536c5cF5EB1bcb58f6723cE26e8D8E90e4",
  },

  // ── BNB Smart Chain ───────────────────────────────────────────────────
  "56": {
    bnb:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    wbnb:  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    usdc:  "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    usdt:  "0x55d398326f99059fF775485246999027B3197955",
    busd:  "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    dai:   "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
    weth:  "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    link:  "0x404460C6A5EdE2D891e8297795264fDe62ADBB75",
    cake:  "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
  },

  // ── Linea ─────────────────────────────────────────────────────────────
  "59144": {
    eth:   "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    weth:  "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34F",
    usdc:  "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
    usdt:  "0xA219439258ca9da29E9Cc4cE5596924745e12B93",
    wbtc:  "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4",
    link:  "0x5B16228B5B4e4205Ab9608a7e862fc6E0EeB16a3",
  },

  // ── Tempo Testnet (MPP/x402) ──────────────────────────────────────────
  "4217": {
    "usdc.e": "0x20C000000000000000000000B9537D11c60E8b50",
  },
};

// Common aliases — map display names to canonical symbols
const SYMBOL_ALIASES: Record<string, string> = {
  "ethereum": "weth", "ether": "weth",
  "native eth": "eth", "native matic": "matic",
  "native avax": "avax", "native bnb": "bnb",
  "usd coin": "usdc", "usd-coin": "usdc",
  "tether": "usdt", "tether usdt": "usdt",
  "wrapped ether": "weth", "wrapped eth": "weth",
  "wrapped bitcoin": "wbtc", "wrapped btc": "wbtc",
  "chainlink": "link",
};

function resolveSymbol(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return SYMBOL_ALIASES[lower] ?? lower;
}

// ─── Tool ────────────────────────────────────────────────────────────────────

export function createTokenAddressTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_token_address",
    description:
      "Look up the contract address for a token symbol on a given chain. " +
      "ALWAYS call this before keeperhub_generate_workflow or keeperhub_protocol_action " +
      "when you need token addresses — never guess or use symbol names as addresses. " +
      "Returns the 0x contract address, decimals, and native token indicator. " +
      "Supports ETH/WETH/USDC/USDT/DAI/WBTC/LINK and 40+ tokens across 13 chains. " +
      "Example: symbol='USDC', chainId='11155111' → 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    schema: z.object({
      symbol: z
        .string()
        .describe("Token symbol or name. Examples: 'USDC', 'WETH', 'ETH', 'LINK', 'DAI', 'USDT', 'WBTC'"),
      chainId: z
        .string()
        .describe(
          "Chain ID as string. Examples: '1' (mainnet), '11155111' (Sepolia), " +
          "'8453' (Base), '42161' (Arbitrum), '10' (Optimism), '137' (Polygon), " +
          "'56' (BSC), '43114' (Avalanche), '84532' (Base Sepolia)"
        ),
    }),
    func: async ({ symbol, chainId }) => {
      const sym = resolveSymbol(symbol);
      const chainTokens = TOKEN_ADDRESSES[chainId];

      if (!chainTokens) {
        return JSON.stringify({
          ok: false,
          symbol,
          chainId,
          error: `Chain ${chainId} not in lookup table. Supported: ${Object.keys(TOKEN_ADDRESSES).join(", ")}`,
        });
      }

      const address = chainTokens[sym];
      if (!address) {
        const available = Object.keys(chainTokens).join(", ");
        return JSON.stringify({
          ok: false,
          symbol,
          chainId,
          error: `Token "${symbol}" (${sym}) not found on chain ${chainId}. Available: ${available}`,
          hint: "If the token isn't listed, search for its address on etherscan.io or the chain's block explorer.",
        });
      }

      const isNative = address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      const decimals =
        sym === "usdc" || sym === "usdt" || sym === "usdc.e" ? 6
        : sym === "wbtc" ? 8
        : sym === "eth" ? 18
        : 18;

      return JSON.stringify({
        ok: true,
        symbol: symbol.toUpperCase(),
        chainId,
        address,
        decimals,
        isNative,
        hint: isNative
          ? "This is the native gas token placeholder address. Use for protocols that accept native ETH/MATIC/etc."
          : `Use address ${address} in your workflow or protocol action config.`,
      });
    },
  });
}
