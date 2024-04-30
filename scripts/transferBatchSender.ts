import { openContract, Contract, address, Cell, beginCell, Address, toNano, fromNano, SendMode, Dictionary, DictionaryValue, Builder,} from '@ton/core';
import BN from "bn.js";
import { OPS } from "./ops";
import { NetworkProvider, sleep } from '@ton/blueprint';
import { TonClient, WalletContract, WalletV3R2Source, contractAddress } from "ton";
import { mnemonicNew, mnemonicToWalletKey } from "ton-crypto";
import { CellMessage, CommonMessageInfo, InternalMessage, StateInit, Slice} from "ton";
import fs from "fs";
import { TokenTransfer, storeTokenTransfer } from '../build/Jetton/tact_SampleJetton';
import { BatchSender, Send, TokenSendInfo, storeTokenSendInfo, loadTokenSendInfo } from '../wrappers/BatchSender';
import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransaction, printTransactionFees } from '@ton/sandbox';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';


import { getHttpEndpoint } from "@orbs-network/ton-access";

const TestParams: [string, number][] = [
  ["UQCxNYjemj5i60KBuuXN71tY_TvrTg7Jpuzxd43_yT5ISALo", 131.0],
  ["UQCxNYjemj5i60KBuuXN71tY_TvrTg7Jpuzxd43_yT5ISALo", 123.0],
  ["UQCxNYjemj5i60KBuuXN71tY_TvrTg7Jpuzxd43_yT5ISALo", 142.0],
  ["UQCxNYjemj5i60KBuuXN71tY_TvrTg7Jpuzxd43_yT5ISALo", 124.0]
]

function payload_body(tokenRoot: Address, length: bigint, sendInfo: Dictionary<bigint, TokenSendInfo>): Cell {
  return beginCell()
    //.storeUint(OPS.Mint, 32) // opcode (reference TODO)
    .storeRef(
      beginCell()
      .storeUint(length, 64) // queryid
      .storeAddress(tokenRoot)
      .endCell()
      
    )
    // .storeDict(sendInfo, Dictionary.Keys.BigInt(257), dictValueParserTokenSendInfo())
    .storeRef(
      // internal transfer message
      beginCell()
        .storeUint(0,8)
        .storeDict(sendInfo, Dictionary.Keys.BigInt(257), dictValueParserTokenSendInfo())
        .endCell()
    )
    .endCell();
}

function dictValueParserTokenSendInfo(): DictionaryValue<TokenSendInfo> {
  return {
      serialize: (src, buidler) => {
          buidler.storeRef(beginCell().store(storeTokenSendInfo(src)).endCell());
      },
      parse: (src) => {
          return loadTokenSendInfo(src.loadRef().beginParse());
      }
  }
}

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

    let message_dict = Dictionary.empty(Dictionary.Keys.BigUint(257), dictValueParserTokenSendInfo())
    let send_sum = 0;
    for (let i = 0; i < TestParams.length; i++){
        message_dict.set(BigInt(i), { 
          $$type: 'TokenSendInfo',
          recipient: address(TestParams[i][0]),
          value: toNano(TestParams[i][1]),
        })
        send_sum += TestParams[i][1];
    }

    console.log(`Open contracts....`);
    
    const batchSender = provider.open(BatchSender.fromAddress(address("EQCp9JUfe1rLfPZgc0Sj2e0ZaHHYk2nZPNxf-r1bvtZGraP8")));
    //PROD
    //const batchSender = provider.open(BatchSender.fromAddress(address("EQAcIyvwcketMGM9VvjRZXSaONeCoOeLrFpf_WE640eORkB1")));
    const JettonAddress2 = address("EQCpx8W6yIfsNh_fpUSpPWo-HEcRj06PEjByq3za4QcduFwL")
    const walletAddress = address("0QCItp_BXJSu2m4qgtUcbKy7gTTQ6fIdokNInFoHIBJ2Fjnm")
    const senderWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(walletAddress));

    console.log(`Building payload....`);
    const owner = await batchSender.getOwner()
    const stopped = await batchSender.getStopped()
    // console.log(`owner  ${owner}\nstopped ${stopped}`);
    const len  = await batchSender.getFullTonSendAddiction(
      2n
    )
    // console.log(len);
    // console.log(`${TestParams.length}\n${JettonAddress2}\n${message_dict.keys()}`);
    const payload = payload_body(JettonAddress2, BigInt(TestParams.length), message_dict)
    console.log(payload);
    
  //   const payload = await batchSender.getBuildTokenSendPayload(
  //     {
  //         $$type: "TokenSend",
  //         length: BigInt(TestParams.length),
  //         tokenRoot: JettonAddress2,
  //         sendInfo: message_dict
  //     }
  // )

    const transferMessage: TokenTransfer = {
      $$type: "TokenTransfer",
      queryId: 0n,
      amount: toNano(send_sum),
      destination: batchSender.address,
      response_destination: provider.sender().address!,
      custom_payload: null,
      forward_ton_amount: toNano("0.09") * BigInt(TestParams.length) + toNano('0.02') + (toNano("0.0086") * BigInt(TestParams.length)),
      forward_payload: payload,
  };
  const buidler = new Builder()
  storeTokenTransfer(transferMessage)(buidler)

  console.log(`Stored cell size - ${buidler.bits}`);
    //const transferResult = await senderWallet.send(sender.getSender(), { value: toNano("0.1") * BigInt(Senders) + toNano(1) + toNano('1000') }, transferMessage);
//   await provider.sender().send(
//     {
//         value: toNano("0.1") * BigInt(TestParams.length) + toNano(1),
//         to: senderWallet.address,
//         sendMode: SendMode.PAY_GAS_SEPARATELY,
//         bounce: false,
//         body: buidler.endCell()
//     }
// )
await senderWallet.send(provider.sender(), { value: toNano("0.1") * BigInt(TestParams.length) + toNano(1) }, transferMessage, true);


    // const endpoint = await getHttpEndpoint({
    //     network: isTestnet ? "testnet": 'mainnet',
    //   });
    
    // const client = new TonClient({ endpoint: `https://${isTestnet ? "testnet." : ""}toncenter.com/api/v2/jsonRPC` , apiKey : 'fb0a4950990a2177b084f53ae62a15c859a09406158374d2456c67f4b675a21f'});
    // //const client = new TonClient({ endpoint });
    // const deployerWalletType = "org.ton.wallets.v3.r2"; // also see WalletV3R2Source class used below
    // const newContractFunding = toNano(0.08); // this will be (almost in full) the balance of a new deployed contract and allow it to pay rent
    // const workchain = 0; // normally 0, only special contracts should be deployed to masterchain (-1)
  
    // // make sure we have a wallet mnemonic to deploy from (or create one if not found)
    // const deployConfigEnv = ".env";
    // let deployerMnemonic;
    // if (!fs.existsSync(deployConfigEnv) || !process.env.DEPLOYER_MNEMONIC) {
    //   console.log(`\n* Config file '${deployConfigEnv}' not found, creating a new wallet for deploy..`);
    //   deployerMnemonic = (await mnemonicNew(24)).join(" ");
    //   const deployWalletEnvContent = `DEPLOYER_WALLET=${deployerWalletType}\nDEPLOYER_MNEMONIC="${deployerMnemonic}"\n`;
    //   fs.writeFileSync(deployConfigEnv, deployWalletEnvContent);
    //   console.log(` - Created new wallet in '${deployConfigEnv}' - keep this file secret!`);
    // } else {
    //   console.log(`\n* Config file '${deployConfigEnv}' found and will be used for deployment!`);
    //   deployerMnemonic = process.env.DEPLOYER_MNEMONIC;
    // }
  
    // // open the wallet and make sure it has enough TON
    // const walletKey = await mnemonicToWalletKey(deployerMnemonic.split(" "));
    // const walletContract = WalletContract.create(client, WalletV3R2Source.create({ publicKey: walletKey.publicKey, workchain }));
    // console.log(` - Wallet address used to deploy from is: ${walletContract.address.toFriendly()}`);
    
    // // const walletBalance = await client.getBalance(walletContract.address);
    // // if (walletBalance.lt(newContractFunding)) {
    // //   console.log(` - ERROR: Wallet has less than ${newContractFunding} TON for gas (${fromNano(walletBalance)} TON), please send some TON for gas first`);
    // //   process.exit(1);
    // // } else {
    // //   console.log(` - Wallet balance is ${fromNano(walletBalance)} TON, which will be used for gas`);
    // // }

    // const JettonAddress = Address.parse("EQCpx8W6yIfsNh_fpUSpPWo-HEcRj06PEjByq3za4QcduFwL")
    // await sleep(2000)
    // const seqno = await walletContract.getSeqNo();
    // log(seqno)


    // await provider.sender().send(
    //     {
    //         value: toNano(0.08),
    //         to: JettonAddress2,
    //         sendMode: SendMode.PAY_GAS_SEPARATELY,
    //         bounce: false,
    //         body: mintBody2(provider.sender().address!, toNano(1_000_000_000))
    //     }
    // )


    // await sleep(2000)
    // //await client.sendExternalMessage(walletContract, transfer);
    // console.log(` - Block explorer link: https://${process.env.TESTNET ? "test." : ""}tonwhales.com/explorer/address/${JettonAddress2.toString()}`);

    //const deployerMnemonic = "harvest van later define pupil pupil galaxy hybrid peasant horse recipe true cluster question brown goddess wire cradle keep choose minute ostrich giraffe subject"
    //const batchSender = provider.open(BatchSender.fromAddress(address("EQAcIyvwcketMGM9VvjRZXSaONeCoOeLrFpf_WE640eORkB1")));

    //await sleep(2000)
    //const res = await batchSender.getOwner();

    // const walletKey = await mnemonicToWalletKey(deployerMnemonic.split(" "));
    // const walletContract = WalletContract.create(client, WalletV3R2Source.create({ publicKey: walletKey.publicKey, workchain }));

    // await provider.waitForDeploy(batchSender.address);

    //console.log('OWNER = ', res);
}