const {
  buildSimpleTransaction,
  TOKEN_PROGRAM_ID,
  SPL_ACCOUNT_LAYOUT,
  LOOKUP_TABLE_CACHE,
  TxVersion,
} = require("@raydium-io/raydium-sdk");
const { VersionedTransaction } = require("@solana/web3.js");
const { connection, wallet } = require("./config");
const addLookupTableInfo = LOOKUP_TABLE_CACHE;
const makeTxVersion = TxVersion.V0;

async function sendTx(connection, payer, txs, options) {
  const txids = [];
  for (const iTx of txs) {
    if (iTx instanceof VersionedTransaction) {
      iTx.sign([payer]);
      txids.push(await connection.sendTransaction(iTx, options));
    } else {
      txids.push(await connection.sendTransaction(iTx, [payer], options));
    }
  }
  return txids;
}

async function buildAndSendTx(innerSimpleV0Transaction, options) {
  const willSendTx = await buildSimpleTransaction({
    connection,
    makeTxVersion,
    payer: wallet.publicKey,
    innerTransactions: innerSimpleV0Transaction,
    addLookupTableInfo: addLookupTableInfo,
  });

  return await sendTx(connection, wallet, willSendTx, options);
}

async function getWalletTokenAccount(connection, wallet) {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
    programId: TOKEN_PROGRAM_ID,
  });
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

module.exports = {
  buildAndSendTx,
  getWalletTokenAccount,
};
