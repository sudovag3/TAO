import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransaction, printTransactionFees } from '@ton/sandbox';
import { toNano, Address, Dictionary, DictionaryValue, beginCell, fromNano, Cell, Builder } from '@ton/core';
import { compile } from '@ton/blueprint';
import { BatchSender, Send, TokenSendInfo, storeTokenSendInfo, loadTokenSendInfo } from '../wrappers/BatchSender';
import '@ton/test-utils';
import { JettonWallet } from '../wrappers/JettonWallet';
import { log } from 'console';
// import { Jetton } from '../wrappers/Jetton';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';
import { SampleJetton, Mint, TokenTransfer, storeTokenTransfer } from '../build/Jetton/tact_SampleJetton';
import { buildOnchainMetadata } from "../utils/jetton-helpers";

export function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

export function dictValueParserTokenSendInfo(): DictionaryValue<TokenSendInfo> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeTokenSendInfo(src)).endCell());
        },
        parse: (src) => {
            return loadTokenSendInfo(src.loadRef().beginParse());
        }
    }
}

export function payload_body(tokenRoot: Address, length: bigint, sendInfo: Dictionary<bigint, TokenSendInfo>): Cell {
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

const jettonParams = {
    name: "Best Practice",
    description: "This is description of Test tact jetton",
    symbol: "XXXE",
    image: "https://play-lh.googleusercontent.com/ahJtMe0vfOlAu1XJVQ6rcaGrQBgtrEZQefHy7SXB7jpijKhu1Kkox90XDuH8RmcBOXNn",
};

const jettonStableParams = {
    uri: "https://play-lh.googleusercontent.com/ahJtMe0vfOlAu1XJVQ6rcaGrQBgtrEZQefHy7SXB7jpijKhu1Kkox90XDuH8RmcBOXNn",
};

let content = buildOnchainMetadata(jettonParams);
let max_supply = toNano(1234766689011); // Set the specific total supply in nano

// describe('BatchSender', () => {

//     let blockchain: Blockchain;
//     let deployer: SandboxContract<TreasuryContract>;
//     let batchSender: SandboxContract<BatchSender>;
//     //let UniverseSender: SandboxContract<TreasuryContract>;
//     let token: SandboxContract<SampleJetton>;
//     let jettonWallet: SandboxContract<JettonDefaultWallet>;
//     let batchSenderWallet: SandboxContract<JettonDefaultWallet>;

//     let code: Cell;

//     beforeEach(async () => {
//         blockchain = await Blockchain.create();
//         blockchain.verbosity = {
//             print: true,
//             blockchainLogs: false,
//             vmLogs: 'none',
//             debugLogs: true,
//         }

//         deployer = await blockchain.treasury('deployer');
        
//         // ============================================================ //
//         // CREATE TEST JETTON
//         token = blockchain.openContract(await SampleJetton.fromInit(deployer.address, content, max_supply));

//         // Send Transaction
//         const deployJettonResult = await token.send(deployer.getSender(), { value: toNano("10") }, "Mint: 100");
//         expect(deployJettonResult.transactions).toHaveTransaction({
//             from: deployer.address,
//             to: token.address,
//             deploy: true,
//             success: true,
//         });

//         const playerWallet = await token.getGetWalletAddress(deployer.address);
//         jettonWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(playerWallet));
//         // ============================================================ //
//         // CREATE BACTH SENDER

//         batchSender = blockchain.openContract(await BatchSender.fromInit(0n, toNano(0.09)));
       
        

//         const deployResult = await batchSender.send(
//             deployer.getSender(),
//             {
//                 value: toNano('0.05'),
//             },
//             {
//                 $$type: 'Deploy',
//                 queryId: 0n,
//             }
//         );

//         await blockchain.setVerbosityForAddress(batchSender.address,{
//             print: true,
//             blockchainLogs: false,
//             vmLogs: 'none',
//             debugLogs: true,
//         })

//         expect(deployResult.transactions).toHaveTransaction({
//             from: deployer.address,
//             to: batchSender.address,
//             deploy: true,
//             success: true,
//         });
//         // ============================================================ //
//         // Deploy Coin on Func
//         // ============================================================ //
//         // Create wallet for batch sender
//         const wallet = await token.getGetWalletAddress(batchSender.address);
//         batchSenderWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(wallet));

//         console.log(`Jetton - ${token.address}`);
        
//         console.log(`batchSender - ${batchSender.address}`);

//         console.log(`batchSenderWallet - ${batchSenderWallet.address}`);
//         console.log(`batchSender - ${batchSender.address}`);

//     });


//     it('should send Jettons', async () => {
//         const Senders = 4;
//         let send_sum = 0;
//         const senders_array: {[id: string]: {
//             $$type:  'TokenSendInfo',
//             recipient: SandboxContract<TreasuryContract>,
//             value: BigInt
//         }} = {}
        
//         let message_dict = Dictionary.empty(Dictionary.Keys.BigUint(256), dictValueParserTokenSendInfo())
//         for (let i = 0; i < Senders; i++) {
//             const sender = await blockchain.treasury('sender' + i, {
//                 balance: 0n
//             });
//             const send_value = getRandomInt(100) + 1
//             senders_array[i] = { 
//                 $$type: 'TokenSendInfo',
//                 recipient: sender,
//                 value: toNano(send_value),
//             }
//             message_dict.set(BigInt(i), { 
//                 $$type: 'TokenSendInfo',
//                 recipient: sender.address,
//                 value: toNano(send_value),
//             })
//             send_sum += send_value;
//         }

//         // const payload = await batchSender.getBuildTokenSendPayload(
//         //     {
//         //         $$type: "TokenSend",
//         //         length: BigInt(Senders),
//         //         tokenRoot: deployer.address,
//         //         sendInfo: message_dict
//         //     }
//         // )

//         const payload = payload_body(
//             deployer.address,
//             BigInt(Senders),
//             message_dict
//         )


//         console.log(payload);
        

//         expect(payload).not.toBeUndefined();
        
//         const sender = await blockchain.treasury("sender");
//         const initMintAmount = toNano(send_sum);
//         const transferAmount = toNano(send_sum);


//         console.log(`transferAmount - ${transferAmount}`);
//         console.log(`initMintAmount - ${initMintAmount}`);
        
//         const mintMessage: Mint = {
//             $$type: "Mint",
//             amount: initMintAmount,
//             receiver: sender.address,
//         };
//         const mintResult = await token.send(
//             deployer.getSender(), 
//             { value:  toNano('0.25')}, 
//             mintMessage
//             );
        
//         // console.log(mintResult);
        
//         // mintResult.transactions.forEach((trans) => {
//         //     //@ts-ignore
//         //     if (trans.description.aborted == true){
//         //         console.log(trans.vmLogs);
//         //     }
//         // })

//         const senderWalletAddress = await token.getGetWalletAddress(sender.address);
//         const senderWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(senderWalletAddress));
//         //const receiverWalletDataBeforeTransfer = await batchSenderWallet.getGetWalletData();
//         const senderWalletDataBeforeTransfer = await senderWallet.getGetWalletData();
//         console.log(`senderWalletAddress Balance BEFORE = ${senderWalletDataBeforeTransfer.balance}`);
        
//         //console.log(`batchSenderWallet Balance BEFORE = ${receiverWalletDataBeforeTransfer.balance}`);
//         // Transfer tokens from sender's wallet to receiver's wallet // 0xf8a7ea5
//         const transferMessage: TokenTransfer = {
//             $$type: "TokenTransfer",
//             queryId: 0n,
//             amount: transferAmount,
//             destination: batchSender.address,
//             response_destination: sender.address,
//             custom_payload: null,
//             forward_ton_amount: toNano("0.09") * BigInt(Senders) + toNano('0.02') + (toNano("0.0086") * BigInt(Senders)),
//             forward_payload: payload,
//         };

//         const buidler = new Builder()
//         storeTokenTransfer(transferMessage)(buidler)
        
//         const transferResult = await senderWallet.send
//         (
//             sender.getSender(), 
//             { value: toNano("0.1") * BigInt(Senders) + toNano(1) + toNano('1000') }, 
//             transferMessage, 
//             true
//         );

//         expect(transferResult.transactions).toHaveTransaction({
//             from: sender.address,
//             to: senderWallet.address,
//             success: true,
//         });
        
//         transferResult.transactions.forEach((trans) => {
//             //@ts-ignore
//             if (trans.description.aborted == true){
//                 console.log(trans.vmLogs);
//             }
//         })
//         //printTransactionFees(transferResult.transactions);


//         for (let i = 0; i < Senders; i++) {
//                     const recipientWalletAddress = await token.getGetWalletAddress(senders_array[i].recipient.address);
//                     const recipientWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(recipientWalletAddress));
//                     const balance = (await recipientWallet.getGetWalletData()).balance
//                     console.log(`Wallet ${i} (${recipientWalletAddress}) - ${balance} JETTONS`);
//                     //expect(balance).toBe(senders_array[i].value)
//                 }

//         const senderWalletDataAfterTransfer = await senderWallet.getGetWalletData();
//         const receiverWalletDataAfterTransfer = await batchSenderWallet.getGetWalletData();


//         console.log(`senderWalletDataAfterTransfer = ${senderWalletDataAfterTransfer.balance}`);
//         console.log(`batchSenderWallet Balance = ${receiverWalletDataAfterTransfer.balance}`);

//         // expect(senderWalletDataAfterTransfer.balance).toEqual(initMintAmount - transferAmount); // check that the sender transferred the right amount of tokens
//         // expect(receiverWalletDataAfterTransfer.balance).toEqual(transferAmount);

//     });


// });
