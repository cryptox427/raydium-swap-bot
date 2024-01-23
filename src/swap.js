const axios = require("axios");
const {
  Percent,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  Token,
} = require("@raydium-io/raydium-sdk");
const { PublicKey } = require("@solana/web3.js");
const {
  getNewTokens,
  filterTokenRecords,
  getBuyables,
  updateBuyInfo,
  getSellables,
  updateSellInfo,
} = require("./db");
const { swapOnlyAmm } = require("./raydium");
const { getWalletTokenAccount } = require("./util");
const {
  RAYDIUM_API,
  WSOL,
  buyAmount,
  connection,
  wallet,
  exitTarget,
  newTokenAvailable,
} = require("./config");

const getTokenInfoFromRaydium = (token_address) => {
  axios
    .get(RAYDIUM_API + token_address)
    .then((res) => {
      if (res.data.pairs == null) {
        filterTokenRecords(token_address, null, null, null, null, false);
      }
      const data = res?.data?.pairs[0];
      console.log("baseToken:", data.baseToken);
      console.log("quoteToken:", data.quoteToken);
      console.log("volume:", data.volume);
      console.log("priceChange:", data.priceChange);
      console.log("liquidity:", data.liquidity);

      if (data.liquidity.quote < 1) {
        filterTokenRecords(
          data.baseToken.address,
          data.baseToken.symbol,
          data.pairAddress,
          data.liquidity.usd,
          data.priceUsd,
          false
        );
      } else {
        filterTokenRecords(
          data.baseToken.address,
          data.baseToken.symbol,
          data.pairAddress,
          data.liquidity.usd,
          data.priceUsd,
          true
        );
      }
    })
    .catch((err) => console.error(err));
};

const getLiquidityInfoAndUpdateDB = async () => {
  try {
    getNewTokens((err, result) => {
      if (err) {
        console.error(err);
      } else {
        for (const row of result) {
          getTokenInfoFromRaydium(row.token_address);
        }
      }
    });
  } catch (error) {
    console.error(`Fetching raydium api error: ${error}`);
  }
};

const buy = async () => {
  try {
    getBuyables(async (err, rows) => {
      if (err) {
        console.error(err);
      } else {
        for (const row of rows) {
          const inputToken = new Token(
            TOKEN_PROGRAM_ID,
            new PublicKey(WSOL),
            9,
            "WSOL",
            "WSOL"
          );

          const outputToken = new Token(
            TOKEN_PROGRAM_ID,
            new PublicKey(row.token_address),
            row.token_decimal,
            "",
            ""
          );

          const targetPool = row.pool_address;
          const inputTokenAmount = new TokenAmount(
            inputToken,
            buyAmount * (10 ** 9)
          );
          const slippage = new Percent(1, 100);
          const walletTokenAccounts = await getWalletTokenAccount(
            connection,
            wallet.publicKey
          );
          console.log('buy step started!')

          swapOnlyAmm({
            outputToken,
            targetPool,
            inputTokenAmount,
            slippage,
            walletTokenAccounts,
            wallet: wallet,
          }).then(({ txids, amountOut }) => {
            /** continue with txids */
            if (txids != null) {
              console.log("buy success!", txids, amountOut);
              updateBuyInfo(amountOut, row.token_address);
            }
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error while buying: ${error}`);
  }
};

const sell = async () => {
  try {
    getSellables(async (err, rows) => {
      if (err) {
        console.error(err);
      } else {
        for (const row of rows) {
          const inputToken = new Token(
            TOKEN_PROGRAM_ID,
            new PublicKey(row.token_address),
            row.token_decimal,
            "",
            ""
          );

          const outputToken = new Token(
            TOKEN_PROGRAM_ID,
            new PublicKey(WSOL),
            9,
            "WSOL",
            "WSOL"
          );

          const targetPool = row.pool_address;
          const inputTokenAmount = new TokenAmount(
            inputToken,
            row.buy_amount * (10 ** row.token_decimal)
          );
          const slippage = new Percent(1, 100);
          const walletTokenAccounts = await getWalletTokenAccount(
            connection,
            wallet.publicKey
          );
          
          console.log('sell step started!')
          swapOnlyAmm({
            outputToken,
            targetPool,
            inputTokenAmount,
            slippage,
            walletTokenAccounts,
            wallet: wallet,
          }).then(({ txids, amountOut }) => {
            /** continue with txids */
            if (txids != null) {
              console.log("successfully sold!", txids, amountOut);
              updateSellInfo(row.token_address);
            }
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error while buying: ${error}`);
  }
};

const runSwapJob = async () => {
  // getLiquidityInfoAndUpdateDB();
  buy();
  sell();
};

module.exports = {
  runSwapJob,
};
