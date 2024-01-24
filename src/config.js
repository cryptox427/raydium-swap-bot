const { Connection, Keypair } = require("@solana/web3.js");
const base58 = require("bs58");
require("dotenv").config();

// constants
const RAYDIUM_PROTOCOL = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const RAYDIUM_API = "https://api.dexscreener.com/latest/dex/tokens/";
const WSOL = "So11111111111111111111111111111111111111112";
const TEST_LOOP = 5;

// .env
const rpcUrl = process.env.RPC_URL;
const wssUrl = rpcUrl.replace("https", "wss");
const exitTarget = process.env.EXIT_TARGET;
const buyAmount = process.env.BUY_AMOUNT;

// Solana connection and wallet
const connection = new Connection(rpcUrl);
// const wallet = Keypair.fromSecretKey(base58.decode(process.env.WALLET_KEY));
const wallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(process.env.WALLET_KEY))
);

// modules
module.exports = {
  connection,
  RAYDIUM_PROTOCOL,
  RAYDIUM_API,
  wallet,
  WSOL,
  wssUrl,
  exitTarget,
  buyAmount,
  TEST_LOOP,
};
