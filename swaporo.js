import dotenv from "dotenv";
import figlet from "figlet";
import chalk from "chalk";
import gradient from "gradient-string";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { coins } from "@cosmjs/stargate";

dotenv.config();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const MNEMONIC = process.env.MNEMONIC;
const RPC = process.env.RPC || "https://testnet-rpc.zigchain.com";
const CHAIN_ID = process.env.CHAIN_ID || "zig-test-2";

// Kontrak swap Oroswap testnet
const SWAP_CONTRACTS = [
  "zig15jqg0hmp9n06q0as7uk3x9xkwr9k3r7yh4ww2uc0hek8zlryrgmsamk4qg",
  "zig1r50m5lafnmctat4xpvwdpzqndynlxt2skhr4fhzh76u0qar2y9hqu74u5h",
  "zig1unc0549k2f0d7mjjyfm94fuz2x53wrx3px0pr55va27grdgmspcqsp4692",
];

async function getBalance(client, address) {
  const balance = await client.getBalance(address, "uzig");
  return balance.amount;
}

async function main() {
  console.log(gradient.cristal(figlet.textSync("OROSWAP BOT", { horizontalLayout: "full" })));
  console.log(chalk.red("TESTNET ORO BY @REDIXAIRDROP\n"));

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: "zig" });
  const [account] = await wallet.getAccounts();

  const client = await SigningCosmWasmClient.connectWithSigner(RPC, wallet, {
    prefix: "zig",
    gasPrice: "0.025uzig",
  });

  console.log(chalk.green(`🔑 Wallet: ${account.address}`));
  const startingBalance = await getBalance(client, account.address);
  console.log(chalk.cyan(`💰 Saldo awal: ${startingBalance} uzig\n`));

  while (true) {
    for (const contract of SWAP_CONTRACTS) {
      try {
        const msg = {
          swap: {
            offer_asset: {
              amount: "10000",
              info: {
                native_token: {
                  denom: "uzig",
                },
              },
            },
            max_spread: "0.01",
          },
        };

        const result = await client.execute(
          account.address,
          contract,
          msg,
          "auto",
          `Swap to ${contract.slice(0, 10)}...`,
          coins("10000", "uzig")
        );

        console.log(chalk.blueBright(`✅ Swap sukses [${contract.slice(0, 10)}]: ${result.transactionHash}`));
      } catch (err) {
        console.error(chalk.red(`❌ Swap gagal [${contract.slice(0, 10)}]: ${err.message || err}`));
      }

      await delay(10000); // delay antar swap
    }

    const currentBalance = await getBalance(client, account.address);
    console.log(chalk.magenta(`\n💎 Sisa saldo uzig: ${currentBalance} uzig`));
    console.log(chalk.yellow("⏳ LOADING 10 DETIK \n"));
    await delay(10000);
  }
}

main();
