import dotenv from "dotenv";
import figlet from "figlet";
import chalk from "chalk";
import gradient from "gradient-string";                                                                                                              import axios from "axios";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";                                                                                     import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";                                                                                   import { coins } from "@cosmjs/stargate";

dotenv.config();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const MNEMONIC = process.env.MNEMONIC;
const RPC_LIST = [                                                                                                                                     process.env.RPC,
  "https://testnet-rpc.zigchain.com",
  "https://rpc.zigscan.net/",                                                                                                                        ];
const CHAIN_ID = process.env.CHAIN_ID || "zig-test-2";
const API_URL = "https://testnet-api.oroswap.org/api/";

const SWAP_CONTRACTS = [
  "zig15jqg0hmp9n06q0as7uk3x9xkwr9k3r7yh4ww2uc0hek8zlryrgmsamk4qg",
  "zig1r50m5lafnmctat4xpvwdpzqndynlxt2skhr4fhzh76u0qar2y9hqu74u5h",                                                                                    "zig1unc0549k2f0d7mjjyfm94fuz2x53wrx3px0pr55va27grdgmspcqsp4692",
];

const ADD_LIQUIDITY_CONTRACT = SWAP_CONTRACTS[0];

async function getBalance(client, address, denom = "uzig") {
  await delay(1500);
  const balance = await client.getBalance(address, denom);
  return parseInt(balance.amount);
}                                                                                                                                                    
function getRandomAmount(maxBalance) {                                                                                                                 const min = 10000;
  const max = Math.min(50000, Math.floor(maxBalance * 0.3));
  return Math.floor(Math.random() * (max - min) + min);
}

async function getPoints(address) {
  try {
    const response = await axios.get(`${API_URL}portfolio/${address}/points`, {
      headers: {
        accept: 'application/json',                                                                                                                          referer: 'https://testnet.oroswap.org/',
        origin: 'https://testnet.oroswap.org',
      },
    });
    const data = response.data.points[0];
    console.log(chalk.green(`🎯 Points: ${data.points} (Swaps: ${data.swaps_count}, Pools: ${data.join_pool_count})`));                                } catch (error) {
    console.error(chalk.red(`⚠️ Gagal ambil data poin: ${error.message}`));
  }
}                                                                                                                                                    
async function connectClient(wallet) {
  for (let rpc of RPC_LIST) {
    try {
      console.log(chalk.gray(`🔌 Trying RPC: ${rpc}`));
      const client = await SigningCosmWasmClient.connectWithSigner(rpc, wallet, {                                                                            prefix: "zig",
        gasPrice: "0.025uzig",
      });
      console.log(chalk.green(`✅ Connected to RPC: ${rpc}`));                                                                                             return client;
    } catch (err) {
      console.log(chalk.red(`❌ Failed RPC ${rpc}: ${err.message}`));
      await delay(1000);
    }
  }                                                                                                                                                    throw new Error("❌ All RPC endpoints failed!");
}

async function main() {                                                                                                                                console.log(gradient.cristal(figlet.textSync("OROSWAP BOT", { horizontalLayout: "full" })));
  console.log(chalk.red("TESTNET ORO BY @REDIXAIRDROP\n"));

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: "zig" });
  const [account] = await wallet.getAccounts();
  const client = await connectClient(wallet);

  console.log(chalk.green(`🔑 Wallet: ${account.address}`));
  const startingBalance = await getBalance(client, account.address);
  console.log(chalk.cyan(`💰 Saldo awal: ${startingBalance} uzig\n`));

  while (true) {
    for (const contract of SWAP_CONTRACTS) {
      try {
        const currentBalance = await getBalance(client, account.address, "uzig");                                                                            const amount = getRandomAmount(currentBalance);

        const msg = {
          swap: {
            offer_asset: {
              amount: amount.toString(),
              info: {
                native_token: {
                  denom: "uzig",                                                                                                                                     },
              },
            },
            max_spread: "0.01",
          },
        };

        const result = await client.execute(
          account.address,
          contract,                                                                                                                                            msg,
          "auto",
          `Swap to ${contract.slice(0, 10)}...`,
          coins(amount.toString(), "uzig")
        );

        console.log(chalk.blueBright(`✅ Swap sukses [${contract.slice(0, 10)}]: ${result.transactionHash}`));
      } catch (err) {
        console.error(chalk.red(`❌ Swap gagal [${contract.slice(0, 10)}]: ${err.message || err}`));                                                       }                                                                                                                                              
      await delay(3000);                                                                                                                                 }

    try {
      const zigBal = await getBalance(client, account.address, "uzig");
      const oroBal = await getBalance(client, account.address, "coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro");
      const zigAmt = getRandomAmount(zigBal);
      const oroAmt = getRandomAmount(oroBal);                                                                                                        
      const addLiquidityMsg = {
        provide_liquidity: {                                                                                                                                   assets: [
            {
              amount: zigAmt.toString(),
              info: {
                native_token: {
                  denom: "uzig",
                },
              },
            },
            {                                                                                                                                                      amount: oroAmt.toString(),
              info: {
                native_token: {
                  denom: "coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro",
                },
              },
            },
          ],
          slippage_tolerance: "0.5",
        },
      };

      const funds = [
        { denom: "uzig", amount: zigAmt.toString() },
        { denom: "coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro", amount: oroAmt.toString() },
      ].sort((a, b) => a.denom.localeCompare(b.denom));

      const result = await client.execute(
        account.address,
        ADD_LIQUIDITY_CONTRACT,
        addLiquidityMsg,
        "auto",
        "Add Liquidity",
        funds                                                                                                                                              );

      console.log(chalk.green(`💧 Liquidity sukses: ${result.transactionHash}`));
    } catch (err) {                                                                                                                                        console.error(chalk.red(`🚫 Gagal add liquidity: ${err.message || err}`));
    }

    await getPoints(account.address);

    const finalBalance = await getBalance(client, account.address);
    console.log(chalk.magenta(`\n💎 Sisa saldo uzig: ${finalBalance} uzig`));
    console.log(chalk.yellow("⏳ Delay 10 detik sebelum ulang loop...\n"));
    await delay(10000);
  }
}

main();
