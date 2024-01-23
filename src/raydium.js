const {
  Liquidity,
  TxVersion,
  Market,
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  SPL_MINT_LAYOUT,
  jsonInfo2PoolKeys,
} = require("@raydium-io/raydium-sdk");
const assert = require("assert");
const { PublicKey } = require("@solana/web3.js");
const { connection } = require("./config");
const { buildAndSendTx } = require("./util");

const makeTxVersion = TxVersion.V0;

async function formatAmmKeysById(id) {
  const account = await connection.getAccountInfo(new PublicKey(id));
  if (account === null) throw Error(" get id info error ");
  const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);
  const marketId = info.marketId;
  const marketAccount = await connection.getAccountInfo(marketId);
  if (marketAccount === null) throw Error(" get market info error");
  const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

  const lpMint = info.lpMint;
  const lpMintAccount = await connection.getAccountInfo(lpMint);
  if (lpMintAccount === null) throw Error(" get lp mint info error");
  const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

  return {
    id,
    baseMint: info.baseMint.toString(),
    quoteMint: info.quoteMint.toString(),
    lpMint: info.lpMint.toString(),
    baseDecimals: info.baseDecimal.toNumber(),
    quoteDecimals: info.quoteDecimal.toNumber(),
    lpDecimals: lpMintInfo.decimals,
    version: 4,
    programId: account.owner.toString(),
    authority: Liquidity.getAssociatedAuthority({
      programId: account.owner,
    }).publicKey.toString(),
    openOrders: info.openOrders.toString(),
    targetOrders: info.targetOrders.toString(),
    baseVault: info.baseVault.toString(),
    quoteVault: info.quoteVault.toString(),
    withdrawQueue: info.withdrawQueue.toString(),
    lpVault: info.lpVault.toString(),
    marketVersion: 3,
    marketProgramId: info.marketProgramId.toString(),
    marketId: info.marketId.toString(),
    marketAuthority: Market.getAssociatedAuthority({
      programId: info.marketProgramId,
      marketId: info.marketId,
    }).publicKey.toString(),
    marketBaseVault: marketInfo.baseVault.toString(),
    marketQuoteVault: marketInfo.quoteVault.toString(),
    marketBids: marketInfo.bids.toString(),
    marketAsks: marketInfo.asks.toString(),
    marketEventQueue: marketInfo.eventQueue.toString(),
    lookupTableAccount: PublicKey.default.toString(),
  };
}

async function swapOnlyAmm(input) {
  try {
    // -------- pre-action: get pool info --------
    const targetPoolInfo = await formatAmmKeysById(input.targetPool);
    assert(targetPoolInfo, "cannot find the target pool");
    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo);
    // -------- step 1: coumpute amount out --------
    const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
      poolKeys: poolKeys,
      poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
      amountIn: input.inputTokenAmount,
      currencyOut: input.outputToken,
      slippage: input.slippage,
    });

    // -------- step 2: create instructions by SDK function --------
    const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
      connection,
      poolKeys,
      userKeys: {
        tokenAccounts: input.walletTokenAccounts,
        owner: input.wallet.publicKey,
      },
      amountIn: input.inputTokenAmount,
      amountOut: minAmountOut,
      fixedSide: "in",
      makeTxVersion,
    });

    console.log(
      "amountOut:",
      amountOut.toFixed(),
      "  minAmountOut: ",
      minAmountOut.toFixed()
    );

    return {
      txids: await buildAndSendTx(innerTransactions),
      amountOut: amountOut.toFixed(),
    };
  } catch (error) {
    console.error("Error while swapping:", error);
    return { txids: null, amountOut: null };
  }
}

module.exports = {
  swapOnlyAmm,
};
