import { openContract, Contract, address, Cell, beginCell, Address, toNano, fromNano, SendMode} from '@ton/core';
import BN from "bn.js";
import { OPS } from "./ops";
import { BatchSender } from '../wrappers/BatchSender';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { TonClient, WalletContract, WalletV3R2Source, contractAddress } from "ton";
import { mnemonicNew, mnemonicToWalletKey } from "ton-crypto";
import { CellMessage, CommonMessageInfo, InternalMessage, StateInit, Slice} from "ton";
import fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";

import dotenv from "dotenv";
import { log } from 'console';
dotenv.config();


// function mintBody(ownerAddress: Address, jettonValue: BN): Cell {
//     return beginCell()
//       .storeUint(OPS.Mint, 32) // opcode (reference TODO)
//       .storeUint(0, 64) // queryid
//       .storeAddress(ownerAddress)
//       .storeCoins(toNano(0.05)) // gas fee
//       .storeRef(
//         // internal transfer message
//         beginCell()
//           .storeUint(OPS.InternalTransfer, 32)
//           .storeUint(0, 64)
//           .storeCoins(jettonValue)
//           .storeAddress(null) // TODO FROM?
//           .storeAddress(null) // TODO RESP?
//           .storeCoins(0)
//           .storeBit(false) // forward_payload in this slice, not separate cell
//           .endCell()
//       )
//       .endCell();
//   }

  function mintBody2(ownerAddress: Address, jettonValue: bigint): Cell {
    return beginCell()
      .storeUint(OPS.Mint, 32) // opcode (reference TODO)
      .storeUint(0, 64) // queryid
      .storeAddress(ownerAddress)
      .storeCoins(toNano(0.05)) // gas fee
      .storeRef(
        // internal transfer message
        beginCell()
          .storeUint(OPS.InternalTransfer, 32)
          .storeUint(0, 64)
          .storeCoins(jettonValue)
          .storeAddress(null) // TODO FROM?
          .storeAddress(null) // TODO RESP?
          .storeCoins(0)
          .storeBit(false) // forward_payload in this slice, not separate cell
          .endCell()
      )
      .endCell();
  }

export async function run(
    provider: NetworkProvider
    ) {

    console.log(`=================================================================`);
    console.log(`Deploy script running, let's find some contracts to deploy..`);
    console.log(process.env.TESTNET);
    
  
    //const isTestnet = process.env.TESTNET || process.env.npm_lifecycle_event == "deploy:testnet";
    const isTestnet = true;
    // check input arguments (given through environment variables)
    if (isTestnet) {
      console.log(`\n* We are working with 'testnet' (https://t.me/testgiver_ton_bot will give you test TON)`);
    } else {
      console.log(`\n* We are working with 'mainnet'`);
    }
  
    const client = new TonClient({ endpoint: `https://${isTestnet ? "testnet." : ""}toncenter.com/api/v2/jsonRPC` , apiKey : 'fb0a4950990a2177b084f53ae62a15c859a09406158374d2456c67f4b675a21f'});
    //const client = new TonClient({ endpoint });
    const deployerWalletType = "org.ton.wallets.v3.r2"; // also see WalletV3R2Source class used below
    const newContractFunding = toNano(0.08); // this will be (almost in full) the balance of a new deployed contract and allow it to pay rent
    const workchain = 0; // normally 0, only special contracts should be deployed to masterchain (-1)
  
    // make sure we have a wallet mnemonic to deploy from (or create one if not found)
    const deployConfigEnv = ".env";
    let deployerMnemonic;
    if (!fs.existsSync(deployConfigEnv) || !process.env.DEPLOYER_MNEMONIC) {
      console.log(`\n* Config file '${deployConfigEnv}' not found, creating a new wallet for deploy..`);
      deployerMnemonic = (await mnemonicNew(24)).join(" ");
      const deployWalletEnvContent = `DEPLOYER_WALLET=${deployerWalletType}\nDEPLOYER_MNEMONIC="${deployerMnemonic}"\n`;
      fs.writeFileSync(deployConfigEnv, deployWalletEnvContent);
      console.log(` - Created new wallet in '${deployConfigEnv}' - keep this file secret!`);
    } else {
      console.log(`\n* Config file '${deployConfigEnv}' found and will be used for deployment!`);
      deployerMnemonic = process.env.DEPLOYER_MNEMONIC;
    }
  
    // open the wallet and make sure it has enough TON
    const walletKey = await mnemonicToWalletKey(deployerMnemonic.split(" "));
    const walletContract = WalletContract.create(client, WalletV3R2Source.create({ publicKey: walletKey.publicKey, workchain }));
    console.log(` - Wallet address used to deploy from is: ${walletContract.address.toFriendly()}`);

    const JettonAddress = Address.parse("EQCpx8W6yIfsNh_fpUSpPWo-HEcRj06PEjByq3za4QcduFwL")
    const JettonAddress2 = address("EQCpx8W6yIfsNh_fpUSpPWo-HEcRj06PEjByq3za4QcduFwL")
    await sleep(2000)
    const seqno = await walletContract.getSeqNo();
    log(seqno)


    await provider.sender().send(
        {
            value: toNano(0.08),
            to: JettonAddress2,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            bounce: false,
            body: mintBody2(provider.sender().address!, toNano(1_000_000_000))
        }
    )


    await sleep(2000)
    //await client.sendExternalMessage(walletContract, transfer);
    console.log(` - Block explorer link: https://${process.env.TESTNET ? "test." : ""}tonwhales.com/explorer/address/${JettonAddress2.toString()}`);

    //const deployerMnemonic = "harvest van later define pupil pupil galaxy hybrid peasant horse recipe true cluster question brown goddess wire cradle keep choose minute ostrich giraffe subject"
    //const batchSender = provider.open(BatchSender.fromAddress(address("EQAcIyvwcketMGM9VvjRZXSaONeCoOeLrFpf_WE640eORkB1")));

    //await sleep(2000)
    //const res = await batchSender.getOwner();

    // const walletKey = await mnemonicToWalletKey(deployerMnemonic.split(" "));
    // const walletContract = WalletContract.create(client, WalletV3R2Source.create({ publicKey: walletKey.publicKey, workchain }));

    // await provider.waitForDeploy(batchSender.address);

    //console.log('OWNER = ', res);
}