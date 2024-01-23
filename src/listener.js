const WebSocket = require("ws");
const { PublicKey } = require("@solana/web3.js");
const {
  SPL_MINT_LAYOUT,
  MARKET_STATE_LAYOUT_V3,
} = require("@raydium-io/raydium-sdk");

const { connection, RAYDIUM_PROTOCOL, WSOL, wssUrl } = require("./config");
const globalStore = require("./globalStore");
const { addNewToken } = require("./db");

const seenSignatures = new Set();

async function getTokens(strSignature) {
  try {
    const data = await connection.getParsedTransaction(strSignature, {
      maxSupportedTransactionVersion: 0,
    });
    const instructions = data.transaction.message.instructions;

    for (const instruction of instructions) {
      if (instruction.programId.toString() === RAYDIUM_PROTOCOL) {
        console.log("============NEW POOL DETECTED====================");
        const Token0 = instruction.accounts[8].toString();
        const Token1 = instruction.accounts[9].toString();

        const [baseMintAccount, quoteMintAccount, marketAccount] =
          await connection.getMultipleAccountsInfo([
            new PublicKey(instruction.accounts[8]),
            new PublicKey(instruction.accounts[9]),
            new PublicKey(instruction.accounts[16]),
          ]);

        const baseMintInfo = SPL_MINT_LAYOUT.decode(baseMintAccount.data);
        const quoteMintInfo = SPL_MINT_LAYOUT.decode(quoteMintAccount.data);
        const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);
        const poolAddress = instruction.accounts[4];

        // Your data
        const tableData = [
          { Token_Index: "Pool", "Base Info": instruction.accounts[4] },
          { Token_Index: "Token0", "Base Info": baseMintInfo.decimals },
          { Token_Index: "Token1", "Quote Info": quoteMintInfo.decimals },
          { Token_Index: "Token2", "Market Info": marketInfo.ownAddress },
        ];

        const decimal =
          baseMintInfo.decimals == quoteMintInfo.decimals
            ? 9
            : baseMintInfo.decimals != 9
            ? baseMintInfo.decimals
            : quoteMintInfo.decimals;

        addNewToken(
          Token0 === WSOL ? Token1 : Token0,
          poolAddress.toString(),
          decimal
        );
      }
    }
  } catch (error) {
    console.error(`Error getting tokens info: ${error}`);
  }
}

async function runListener() {
  const ws = new WebSocket(wssUrl);

  // Wait for the WebSocket to open
  await new Promise((resolve) => {
    ws.on("open", resolve);
  });

  // Send subscription request
  ws.send(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "logsSubscribe",
      params: [{ mentions: [RAYDIUM_PROTOCOL] }, { commitment: "finalized" }],
    })
  );

  // Wait for the first response
  const firstResp = await new Promise((resolve) => {
    ws.once("message", resolve);
  });

  const responseDict = JSON.parse(firstResp);

  if ("result" in responseDict) {
    console.log(
      "Subscription successful. Subscription ID:",
      responseDict.result
    );
  }

  // Continuously read from the WebSocket
  ws.on("message", async (response) => {
    const responseDict = JSON.parse(response);

    if (responseDict.params.result.value.err === null) {
      const signature = responseDict.params.result.value.signature;

      if (!seenSignatures.has(signature)) {
        seenSignatures.add(signature);
        const logMessagesSet = new Set(responseDict.params.result.value.logs);

        const search = "initialize2";
        if ([...logMessagesSet].some((message) => message.includes(search))) {
          console.log(`https://solscan.io/tx/${signature}`);
          console.log(
            "Token Addable Status:",
            globalStore.get("newTokenAvailable")
          );
          if (globalStore.get("newTokenAvailable")) await getTokens(signature);
        }
      }
    }
  });

  ws.on("close", (code, reason) => {
    console.error(
      `WebSocket connection closed. Code: ${code}, Reason: ${reason}`
    );
    runListener();
  });
}

module.exports = {
  runListener,
};
