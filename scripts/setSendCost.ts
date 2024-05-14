import { openContract, Contract, address, Cell, beginCell, Address, toNano, fromNano, SendMode, Dictionary, DictionaryValue, Builder,} from '@ton/core';
import BN from "bn.js";
import { OPS } from "./ops";
import { NetworkProvider, sleep } from '@ton/blueprint';
import { TonClient, WalletContract, WalletV3R2Source, contractAddress } from "ton";
import { mnemonicNew, mnemonicToWalletKey } from "ton-crypto";
import { CellMessage, CommonMessageInfo, InternalMessage, StateInit, Slice} from "ton";
import fs from "fs";
import { TokenTransfer, storeTokenTransfer } from '../build/Jetton/tact_SampleJetton';
import { BatchSender, SetSendCost } from '../wrappers/BatchSender';
import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransaction, printTransactionFees } from '@ton/sandbox';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';


import dotenv from "dotenv";
import { log } from 'console';
dotenv.config();


export async function run(
    provider: NetworkProvider
    ) {

    console.log(`=================================================================`);
    console.log(`Deploy script running, let's find some contracts to deploy..`);
    console.log(process.env.TESTNET);
    const blockchain = await Blockchain.create();
  
    //const isTestnet = process.env.TESTNET || process.env.npm_lifecycle_event == "deploy:testnet";
    const isTestnet = true;
    // check input arguments (given through environment variables)
    if (isTestnet) {
      console.log(`\n* We are working with 'testnet' (https://t.me/testgiver_ton_bot will give you test TON)`);
    } else {
      console.log(`\n* We are working with 'mainnet'`);
    }
  
    // initialize globals
    console.log(`Initial parameters....`);
    // const senders_array: {[id: string]: {
    //   $$type:  'TokenSendInfo',
    //   recipient: SandboxContract<TreasuryContract>,
    //   value: BigInt
    // }} = {}
    console.log(`Open contracts....`);
    //РАБОЧИЙ
    //const batchSender = provider.open(BatchSender.fromAddress(address("EQCp9JUfe1rLfPZgc0Sj2e0ZaHHYk2nZPNxf-r1bvtZGraP8")));
    //PROD
    const batchSender = provider.open(BatchSender.fromAddress(address("0QCbVMWAMeUXQzW-ANL7X794p8EYcmNedACqXL4bMBSzR7-u")));

    const oldCost = (await batchSender.getSendCost())

    console.log(`new Send Cost - ${fromNano(oldCost)}`);

    console.log(`Setting send_cost....`);

    const setSendCostMessage: SetSendCost = {
      $$type: "SetSendCost",
      send_cost: toNano("0.05"),
    };

    await batchSender.send(provider.sender(), { value: toNano("0.1")}, setSendCostMessage);

    const newCost = (await batchSender.getSendCost())

    console.log(`new Send Cost - ${fromNano(newCost)}`);
    
}