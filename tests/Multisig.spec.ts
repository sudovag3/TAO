import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { toNano, Dictionary, Address, beginCell, address } from '@ton/core';
import { findTransaction, flattenTransaction } from '@ton/test-utils';
import { SafeDeployerContract, SafeOperation } from '../wrappers/SafeDeployerContract';
import { SafeContract } from '../wrappers/SafeContract';
import { VoteArgs, SafeRequestOperation } from '../wrappers/SafeContract';
import '@ton/test-utils';
import { VoteContract } from '../wrappers/VoteContract';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';
import { SampleJetton, Mint, TokenTransfer, storeTokenTransfer } from '../build/Jetton/tact_SampleJetton';
import { BatchSender, Send, TokenSendInfo, storeTokenSendInfo, loadTokenSendInfo } from '../wrappers/BatchSender';
import { buildOnchainMetadata } from "../utils/jetton-helpers";
import { getRandomInt, dictValueParserTokenSendInfo, payload_body } from './BatchSender.spec';

const jettonParams = {
    name: "Best Practice",
    description: "This is description of Test tact jetton",
    symbol: "XXXE",
    image: "https://play-lh.googleusercontent.com/ahJtMe0vfOlAu1XJVQ6rcaGrQBgtrEZQefHy7SXB7jpijKhu1Kkox90XDuH8RmcBOXNn",
};

let content = buildOnchainMetadata(jettonParams);
let max_supply = toNano(1234766689011);

describe('Multisig', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let multisig: SandboxContract<SafeDeployerContract>;
    let multisigSafe: SandboxContract<SafeContract>;
    let token: SandboxContract<SampleJetton>;
    let jettonWallet: SandboxContract<JettonDefaultWallet>;
    let multisigWallet: SandboxContract<JettonDefaultWallet>;
    let owner1: SandboxContract<TreasuryContract>;
    let batchSenderWallet: SandboxContract<JettonDefaultWallet>;
    let batchSender: SandboxContract<BatchSender>;


    beforeAll(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        multisig = blockchain.openContract(await SafeDeployerContract.fromInit(
            deployer.address,
            toNano("0.0001"),
            toNano(1)
        ));


        const deployResult = await multisig.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: multisig.address,
            deploy: true,
            success: true,
        });

        await multisig.send(deployer.getSender(), { value: toNano(1.001) }, "Deploy new Safe");
        
        multisigSafe = blockchain.openContract(await SafeContract.fromInit(
            deployer.getSender().address,
            BigInt(0)
        ))

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
       
        

        const deployBatchSenderResult = await batchSender.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(deployBatchSenderResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: batchSender.address,
            deploy: true,
            success: true,
        });

    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and multisig are ready to use
        const params = await multisig.getParams()
        expect(params.devFee.toString()).toEqual(toNano("0.0001").toString())

    });

    it('should create request', async () => {
        // the check is done inside beforeEach
        // blockchain and multisig are ready to use
        // let operations = Dictionary.empty<number, SafeOperation>();
        const deploySendResultawait = await multisig.send(deployer.getSender(), { value: toNano(1.001) }, "Deploy new Safe");
        
        multisigSafe = blockchain.openContract(await SafeContract.fromInit(
            deployer.getSender().address,
            BigInt(1)
        ))

        expect(deploySendResultawait.transactions).toHaveTransaction({
            from: multisig.address,
            to: multisigSafe.address,
            deploy: true,
            success: true,
        });

        const safeParameters = await multisigSafe.getParameters()
        expect(safeParameters.requestPrice).toEqual(toNano(1))
    });
    
    it('should update owners', async () => {        
        owner1 = await blockchain.treasury("owner1");

        let operation: SafeOperation = {
            $$type : "SafeOperation",
            transfer:  null,
            parameters:null,
            add:  {
                $$type: 'SafeOperationAdd',
                owner: owner1.address
            },
            remove: null,
            replace: null,
        }

        let args: SafeRequestOperation = {
            $$type: 'SafeRequestOperation',
            ops: {
              $$type: 'SafeOperations',
              ops: Dictionary.empty<number, SafeOperation>()
              .set(0, operation),
              count: 1n
            }
          };
        // blockchain.now = Date.now()
        const blockchainNow = await multisigSafe.getTimenow()
        console.log(`NOW - ${blockchainNow}`);
        

        let vote_args: VoteArgs = {
            $$type: 'VoteArgs',
            safe: multisigSafe.address,
            owners: Dictionary.empty<Address, boolean>()
              .set(deployer.address, true),
            ownersCount: 1n,
            treshold: 1n,
            timeout: blockchainNow + BigInt(60 * 60 * 24),
            ops: {
              $$type: 'SafeOperations',
              ops: Dictionary.empty<number, SafeOperation>()
              .set(0, operation),
              count: 1n
            }
          };

        const multisigVote = blockchain.openContract(await VoteContract.fromInit(
            vote_args
        ))
        
        const deployVoteResult = await multisigSafe.send(deployer.getSender(), {
                    value: toNano(1.001) 
        }, args)
        
        // console.log(deployVoteResult);
        
        expect(deployVoteResult.transactions).toHaveTransaction({
            from: multisigSafe.address,
            to: multisigVote.address,
            deploy: true,
            success: true,
        });

        const completedBefore = await multisigVote.getCompleted()
        expect(completedBefore).toEqual(false)

        const voteResult = await multisigVote.send(deployer.getSender(), {value: toNano(1)}, "YES")

        expect(voteResult.transactions).toHaveTransaction({
            from: multisigVote.address,
            to: multisigSafe.address,
            success: true,
        });

        const completedAfter = await multisigVote.getCompleted()
        expect(completedAfter).toEqual(true)

        const params = await multisigSafe.getOwners()
        expect(params.get(owner1.address)).toEqual(true)
    });

    it('should send to SendBatch', async () => {
        // the check is done inside beforeEach
        // blockchain and multisig are ready to use
        // let operations = Dictionary.empty<number, SafeOperation>();
        const Senders = 190;
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

        const payload = payload_body(
            deployer.address,
            BigInt(Senders),
            message_dict
        )
        
        expect(payload).not.toBeUndefined();
        
        const sender = await blockchain.treasury("sender");
        const initMintAmount = toNano(send_sum);
        const transferAmount = toNano(send_sum);


        console.log(`transferAmount - ${transferAmount}`);
        console.log(`initMintAmount - ${initMintAmount}`);
        
        const mintMessage: Mint = {
            $$type: "Mint",
            amount: initMintAmount,
            receiver: multisigSafe.address,
        };
        const mintResult = await token.send(
            deployer.getSender(), 
            { value:  toNano('0.25')}, 
            mintMessage
            );
        
        const multisigWalletAddress = await token.getGetWalletAddress(multisigSafe.address);
        multisigWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(multisigWalletAddress));
       
        let now = 1000;
        let owner1 = await blockchain.treasury("owner1");
        let owner2 = await  blockchain.treasury("owner2");
        let unknown = await  blockchain.treasury("unknown");
        
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

        const body = beginCell().store(storeTokenTransfer(transferMessage)).endCell();

        let operation: SafeOperation = {
            $$type : "SafeOperation",
            transfer:  {
                $$type: "SafeOperationTransfer",
                to: multisigWallet.address,
                body: body,
                value: toNano("0.1") * BigInt(Senders) + toNano(1),
                mode: BigInt(0),
                bounce: false
            },
            parameters:null,
            add:  null,
            remove: null,
            replace: null,
        }

        let args: SafeRequestOperation = {
            $$type: 'SafeRequestOperation',
            ops: {
              $$type: 'SafeOperations',
              ops: Dictionary.empty<number, SafeOperation>()
              .set(0, operation),
              count: 1n
            }
          };
        // blockchain.now = Date.now()
        const blockchainNow = await multisigSafe.getTimenow()
        console.log(`NOW - ${blockchainNow}`);
        
        const threshold = await multisigSafe.getTreshold()
        const isOwner2 = (await multisigSafe.getIsOwner(owner2.address))

        console.log(threshold, isOwner2);
        

        let vote_args: VoteArgs = {
            $$type: 'VoteArgs',
            safe: multisigSafe.address,
            owners: Dictionary.empty<Address, boolean>()
              .set(deployer.address, true),
            //   .set(owner2.address, true),
            ownersCount: 1n,
            treshold: 1n,
            timeout: blockchainNow + BigInt(60 * 60 * 24),
            ops: {
              $$type: 'SafeOperations',
              ops: Dictionary.empty<number, SafeOperation>()
              .set(0, operation),
              count: 1n
            }
          };
        
        // const multisigVote = blockchain.openContract(await VoteContract.fromInit(
        //     vote_args
        // ))
        
        const deployVoteResult = await multisigSafe.send(deployer.getSender(), {
                    value: toNano("0.1") * BigInt(Senders) + toNano(1) + toNano(1) 
        }, args)
        
        
        // console.log(deployVoteResult);
        
        const multisigVote2Address = flattenTransaction(findTransaction(deployVoteResult.transactions, {
            from: multisigSafe.address,
            deploy: true,
            success: true,
        })!).to

        expect(multisigVote2Address).not.toBeUndefined()

        const multisigVote = blockchain.openContract(await VoteContract.fromAddress(
            multisigVote2Address!
        ))

        expect(deployVoteResult.transactions).toHaveTransaction({
            from: multisigSafe.address,
            to: multisigVote.address,
            deploy: true,
            success: true,
        });

        const completedBefore = await multisigVote.getCompleted()
        expect(completedBefore).toEqual(false)

        const voteResult = await multisigVote.send(deployer.getSender(), {value: toNano(1)}, "YES")

        expect(voteResult.transactions).toHaveTransaction({
            from: multisigVote.address,
            to: multisigSafe.address,
            success: true,
        });
        
        expect(voteResult.transactions).not.toHaveTransaction({
            aborted: true,
            success: false,
        });
        //printTransactionFees(voteResult.transactions);
        const completedAfter = await multisigVote.getCompleted()
        expect(completedAfter).toEqual(true)

        for (let i = 0; i < Senders; i++) {
            const recipientWalletAddress = await token.getGetWalletAddress(senders_array[i].recipient.address);
            const recipientWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(recipientWalletAddress));
            const balance = (await recipientWallet.getGetWalletData()).balance
            //console.log(`Wallet ${i} (${recipientWalletAddress}) - ${balance} JETTONS`);
            expect(balance).toBe(senders_array[i].value)
        }

        console.log(`TO NANO _ ${toNano(1)}`);
        
    });
});
