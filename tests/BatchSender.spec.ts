import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransaction, printTransactionFees } from '@ton/sandbox';
import { toNano, Address, Dictionary, DictionaryValue, beginCell, fromNano, Cell } from '@ton/core';
import { compile } from '@ton/blueprint';
import { BatchSender, Send, TokenSendInfo, storeTokenSendInfo, loadTokenSendInfo } from '../wrappers/BatchSender';
import '@ton/test-utils';
import { JettonWallet } from '../wrappers/JettonWallet';
import { log } from 'console';
// import { Jetton } from '../wrappers/Jetton';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';
import { SampleJetton, Mint, TokenTransfer } from '../build/Jetton/tact_SampleJetton';
import { buildOnchainMetadata } from "../utils/jetton-helpers";

function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
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

describe('BatchSender', () => {

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let batchSender: SandboxContract<BatchSender>;
    //let UniverseSender: SandboxContract<TreasuryContract>;
    let token: SandboxContract<SampleJetton>;
    let jettonWallet: SandboxContract<JettonDefaultWallet>;
    let batchSenderWallet: SandboxContract<JettonDefaultWallet>;

    let code: Cell;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.verbosity = {
            print: true,
            blockchainLogs: false,
            vmLogs: 'none',
            debugLogs: true,
        }

        deployer = await blockchain.treasury('deployer');
        
        // ============================================================ //
        // CREATE TEST JETTON
        token = blockchain.openContract(await SampleJetton.fromInit(deployer.address, content, max_supply));

        // Send Transaction
        const deployJettonResult = await token.send(deployer.getSender(), { value: toNano("10") }, "Mint: 100");
        expect(deployJettonResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            deploy: true,
            success: true,
        });

        const playerWallet = await token.getGetWalletAddress(deployer.address);
        jettonWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(playerWallet));
        // ============================================================ //
        // CREATE BACTH SENDER

        batchSender = blockchain.openContract(await BatchSender.fromInit(0n, toNano(0.09)));
       
        

        const deployResult = await batchSender.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        await blockchain.setVerbosityForAddress(batchSender.address,{
            print: true,
            blockchainLogs: false,
            vmLogs: 'none',
            debugLogs: true,
        })

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: batchSender.address,
            deploy: true,
            success: true,
        });
        // ============================================================ //
        // Deploy Coin on Func
        // ============================================================ //
        // Create wallet for batch sender
        const wallet = await token.getGetWalletAddress(batchSender.address);
        batchSenderWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(wallet));

        console.log(`Jetton - ${token.address}`);
        
        console.log(`batchSender - ${batchSender.address}`);

        console.log(`batchSenderWallet - ${batchSenderWallet.address}`);
        console.log(`batchSender - ${batchSender.address}`);

    });

    // it("Test: Minting is successfully", async () => {
    //     const totalSupplyBefore = (await token.getGetJettonData()).totalSupply;
    //     const mintAmount = toNano(10000000000);
    //     const Mint: Mint = {
    //         $$type: "Mint",
    //         amount: mintAmount,
    //         receiver: deployer.address,
    //     };
    //     const mintResult = await token.send(deployer.getSender(), { value: toNano("10") }, Mint);
    //     expect(mintResult.transactions).toHaveTransaction({
    //         from: deployer.address,
    //         to: token.address,
    //         success: true,
    //     });
    //     const totalSupplyAfter = (await token.getGetJettonData()).totalSupply;
    //     expect(totalSupplyBefore + mintAmount).toEqual(totalSupplyAfter);

    //     const walletData = await jettonWallet.getGetWalletData();
    //     expect(walletData.owner).toEqualAddress(deployer.address);
    //     expect(walletData.balance).toBeGreaterThanOrEqual(mintAmount);
    // });

    // it('should send 10 ton', async () => {
    //     const Senders = 250;
    //     let send_sum = 0;
    //     const senders_array: {[id: string]: {
    //         $$type:  'TokenSendInfo',
    //         recipient: SandboxContract<TreasuryContract>,
    //         value: BigInt
    //     }} = {}
        
    //     let message_dict = Dictionary.empty(Dictionary.Keys.BigUint(256), dictValueParserTokenSendInfo())
    //     for (let i = 0; i < Senders; i++) {
    //         const sender = await blockchain.treasury('sender' + i, {
    //             balance: 0n
    //         });
    //         const send_value = getRandomInt(100)
    //         senders_array[i] = { 
    //             $$type: 'TokenSendInfo',
    //             recipient: sender,
    //             value: toNano(send_value),
    //         }
    //         message_dict.set(BigInt(i), { 
    //             $$type: 'TokenSendInfo',
    //             recipient: sender.address,
    //             value: toNano(send_value),
    //         })
    //         send_sum += send_value;
    //     }

    //     UniverseSender = await blockchain.treasury('universe', {
    //         balance: toNano(send_sum) + toNano("0.01")*BigInt(Senders) + toNano("10000"),
    //     } )
        
    //     const send_message: Send = {
    //         $$type: 'Send',
    //         queryId: 1n,
    //         length: BigInt(Object.keys(senders_array).length),
    //         sum: toNano(send_sum),
    //         sendInfo: message_dict,
    //         cursor: 0n
    //     }

    //     console.log(`Sender Length - ${Object.keys(senders_array).length}`);
    //     console.log(`Universe Balance BEFORE - ${fromNano(await(UniverseSender.getBalance()))}`)
    //     // const counterBefore = await batchSender.getCounter();

    //     // console.log('counter before increasing', counterBefore);

    //     // const increaseBy = BigInt(Math.floor(Math.random() * 100));

    //     // console.log('increasing by', increaseBy);

    //     const tonAddiction = await batchSender.getFullTonSendAddiction(BigInt(Senders))

    //     const increaseResult = await batchSender.send(
    //         UniverseSender.getSender(),
    //         {
    //             value: toNano(send_sum) + tonAddiction + toNano("0.001"),
    //         },
    //         send_message
    //     );
    //     //console.log(`${fromNano(toNano(send_sum) + toNano("0.01")*BigInt(Senders) + toNano(0.3))}\n${fromNano(toNano(send_sum) + tonAddiction)}`);
        
    //     //console.log(increaseResult.transactions);
    //     // log(senders_array[0].recipient)
        
    //     //increaseResult.transactions.forEach((trans) => console.log(trans.blockchainLogs))

    //     //console.log(printTransactionFees(increaseResult.transactions));
    //     for (let i = 0; i < Senders; i++) {
    //         //console.log(`Balance ${i} - ${fromNano(await(senders_array[i].recipient.getBalance()))}\nVALUE - ${fromNano(senders_array[i].value.toString())}`)
    //         expect(Number(fromNano(await(senders_array[i].recipient.getBalance())))).toBeCloseTo(Number(fromNano(senders_array[i].value.toString())), 5)
    //     }

    //     // console.log(`Universe Balance AFTER - ${fromNano(await(UniverseSender.getBalance()))}`)
    //     //console.log(`BatchSender Balance AFTER - ${fromNano(await(await blockchain.getContract(batchSender.address)).balance)}`)
    //     // expect(increaseResult.transactions).toHaveTransaction({
    //     //     from: UniverseSender.address,
    //     //     to: batchSender.address,
    //     //     success: true,
    //     // });

    //     // const counterAfter = await batchSender.getCounter();
    //     expect(Number(fromNano(await(await blockchain.getContract(batchSender.address)).balance))).toBeCloseTo(Number(0), 0)
    //     // console.log('counter after increasing', counterAfter);

    //     // expect(counterAfter).toBe(counterBefore + increaseBy);
    // });

    it('should send Jettons', async () => {
        const Senders = 4;
        let send_sum = 0;
        const senders_array: {[id: string]: {
            $$type:  'TokenSendInfo',
            recipient: SandboxContract<TreasuryContract>,
            value: BigInt
        }} = {}
        
        let message_dict = Dictionary.empty(Dictionary.Keys.BigUint(256), dictValueParserTokenSendInfo())
        for (let i = 0; i < Senders; i++) {
            const sender = await blockchain.treasury('sender' + i, {
                balance: 0n
            });
            const send_value = getRandomInt(100) + 1
            senders_array[i] = { 
                $$type: 'TokenSendInfo',
                recipient: sender,
                value: toNano(send_value),
            }
            message_dict.set(BigInt(i), { 
                $$type: 'TokenSendInfo',
                recipient: sender.address,
                value: toNano(send_value),
            })
            send_sum += send_value;
        }

        const payload = await batchSender.getBuildTokenSendPayload(
            {
                $$type: "TokenSend",
                length: BigInt(Senders),
                tokenRoot: deployer.address,
                sendInfo: message_dict
            }
        )

        console.log(payload);
        

        expect(payload).not.toBeUndefined();
        
        const sender = await blockchain.treasury("sender");
        const initMintAmount = toNano(send_sum);
        const transferAmount = toNano(send_sum);


        console.log(`transferAmount - ${transferAmount}`);
        console.log(`initMintAmount - ${initMintAmount}`);
        
        const mintMessage: Mint = {
            $$type: "Mint",
            amount: initMintAmount,
            receiver: sender.address,
        };
        const mintResult = await token.send(
            deployer.getSender(), 
            { value:  toNano('0.25')}, 
            mintMessage
            );
        
        // console.log(mintResult);
        
        // mintResult.transactions.forEach((trans) => {
        //     //@ts-ignore
        //     if (trans.description.aborted == true){
        //         console.log(trans.vmLogs);
        //     }
        // })

        const senderWalletAddress = await token.getGetWalletAddress(sender.address);
        const senderWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(senderWalletAddress));
        //const receiverWalletDataBeforeTransfer = await batchSenderWallet.getGetWalletData();
        const senderWalletDataBeforeTransfer = await senderWallet.getGetWalletData();
        console.log(`senderWalletAddress Balance BEFORE = ${senderWalletDataBeforeTransfer.balance}`);
        
        //console.log(`batchSenderWallet Balance BEFORE = ${receiverWalletDataBeforeTransfer.balance}`);
        // Transfer tokens from sender's wallet to receiver's wallet // 0xf8a7ea5
        const transferMessage: TokenTransfer = {
            $$type: "TokenTransfer",
            queryId: 0n,
            amount: transferAmount,
            destination: batchSender.address,
            response_destination: sender.address,
            custom_payload: null,
            forward_ton_amount: toNano("0.09") * BigInt(Senders) + toNano('0.02') + (toNano("0.0086") * BigInt(Senders)),
            forward_payload: payload,
        };

        
        const transferResult = await senderWallet.send(sender.getSender(), { value: toNano("0.1") * BigInt(Senders) + toNano(1) + toNano('1000') }, transferMessage);
        expect(transferResult.transactions).toHaveTransaction({
            from: sender.address,
            to: senderWallet.address,
            success: true,
        });
        
        transferResult.transactions.forEach((trans) => {
            //@ts-ignore
            if (trans.description.aborted == true){
                console.log(trans.vmLogs);
            }
        })
        //printTransactionFees(transferResult.transactions);


        for (let i = 0; i < Senders; i++) {
                    const recipientWalletAddress = await token.getGetWalletAddress(senders_array[i].recipient.address);
                    const recipientWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(recipientWalletAddress));
                    const balance = (await recipientWallet.getGetWalletData()).balance
                    console.log(`Wallet ${i} (${recipientWalletAddress}) - ${balance} JETTONS`);
                    //expect(balance).toBe(senders_array[i].value)
                }

        const senderWalletDataAfterTransfer = await senderWallet.getGetWalletData();
        const receiverWalletDataAfterTransfer = await batchSenderWallet.getGetWalletData();


        console.log(`senderWalletDataAfterTransfer = ${senderWalletDataAfterTransfer.balance}`);
        console.log(`batchSenderWallet Balance = ${receiverWalletDataAfterTransfer.balance}`);

        // expect(senderWalletDataAfterTransfer.balance).toEqual(initMintAmount - transferAmount); // check that the sender transferred the right amount of tokens
        // expect(receiverWalletDataAfterTransfer.balance).toEqual(transferAmount);

    });


});
