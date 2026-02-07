import { NextResponse } from "next/server";

const WALLET_ADDRESS = "0x82f403A72d3c1710AD1e5448195FeD0BD0A87C34";
const RPC_URL = "https://polygon-rpc.com";

// Token contracts
const TOKENS = {
  USDC: {
    address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    decimals: 6,
  },
  "USDC.e": {
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    decimals: 6,
  },
};

// ERC20 balanceOf selector
const BALANCE_OF_SELECTOR = "0x70a08231";

async function getMaticBalance(): Promise<number> {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [WALLET_ADDRESS, "latest"],
    }),
  });
  const data = await response.json();
  const balanceWei = BigInt(data.result);
  return Number(balanceWei) / 1e18;
}

async function getTokenBalance(tokenAddress: string, decimals: number): Promise<number> {
  // Encode the balanceOf call
  const data = BALANCE_OF_SELECTOR + WALLET_ADDRESS.slice(2).padStart(64, "0");
  
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        {
          to: tokenAddress,
          data: data,
        },
        "latest",
      ],
    }),
  });
  
  const result = await response.json();
  if (result.result === "0x" || !result.result) {
    return 0;
  }
  
  const balanceRaw = BigInt(result.result);
  return Number(balanceRaw) / Math.pow(10, decimals);
}

async function getMaticPrice(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd",
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );
    const data = await response.json();
    return data["matic-network"]?.usd || 0.5; // Fallback price
  } catch {
    return 0.5; // Fallback price
  }
}

export async function GET() {
  try {
    // Fetch all balances in parallel
    const [maticBalance, usdcBalance, usdceBalance, maticPrice] = await Promise.all([
      getMaticBalance(),
      getTokenBalance(TOKENS.USDC.address, TOKENS.USDC.decimals),
      getTokenBalance(TOKENS["USDC.e"].address, TOKENS["USDC.e"].decimals),
      getMaticPrice(),
    ]);

    const tokens = [
      {
        symbol: "USDC",
        balance: usdcBalance,
        usdValue: usdcBalance, // 1:1 for stablecoins
      },
      {
        symbol: "USDC.e",
        balance: usdceBalance,
        usdValue: usdceBalance, // 1:1 for stablecoins
      },
      {
        symbol: "MATIC",
        balance: maticBalance,
        usdValue: maticBalance * maticPrice,
      },
    ].filter(t => t.balance > 0.0001); // Filter dust

    const totalValue = tokens.reduce((sum, t) => sum + t.usdValue, 0);

    return NextResponse.json({
      address: WALLET_ADDRESS,
      totalValue,
      tokens,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Wallet fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet data" },
      { status: 500 }
    );
  }
}
