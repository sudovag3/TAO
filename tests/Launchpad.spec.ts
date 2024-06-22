import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { fromNano, toNano } from '@ton/core';
import { Launchpad, LaunchpadParams, TokenPrice, TokenBuy } from '../wrappers/Launchpad';
import { buildOnchainMetadata } from "../utils/jetton-helpers";
import { SampleJetton, Mint} from '../build/Jetton/tact_SampleJetton';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';

import '@ton/test-utils';


const jettonParams = {
    name: "Best Practice",
    description: "This is description of Test tact jetton",
    symbol: "XXXE",
    image: "https://play-lh.googleusercontent.com/ahJtMe0vfOlAu1XJVQ6rcaGrQBgtrEZQefHy7SXB7jpijKhu1Kkox90XDuH8RmcBOXNn",
};

let content = buildOnchainMetadata(jettonParams);
let max_supply = toNano(1234766689011);

describe('Launchpad', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let launchpad: SandboxContract<Launchpad>;
    let token: SandboxContract<SampleJetton>;
    let jettonWallet: SandboxContract<JettonDefaultWallet>;
    let launchpadParams: LaunchpadParams;
    let sender: SandboxContract<TreasuryContract>;
    let saleStart: number;
    let saleEnd: number;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        sender = await blockchain.treasury('sender');
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

        const tokenPrice: TokenPrice = {
            $$type: "TokenPrice",
            denominator: 100n,
            numerator: 100n
        }

        const date = new Date()
        saleStart = Math.floor(date.getDate() / 1000)
        saleEnd = Math.floor(date.setDate(date.getDate() + 1) / 1000)

        launchpadParams = {
            $$type: "LaunchpadParams",
            tokenPrice: tokenPrice,
            minCap: toNano(1000),
            maxCap: toNano(1000000),
            saleStart: BigInt(saleStart),
            saleEnd: BigInt(saleEnd),
            tokenDecimals: 9n,
            tokenMaster: token.address,
            minPurchase: toNano(10),
            maxPurchase: toNano(100)
        }

        launchpad = blockchain.openContract(await Launchpad.fromInit(launchpadParams, deployer.address, false));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await launchpad.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: launchpad.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and launchpad are ready to use
        expect((await launchpad.getParams()).tokenMaster.toString()).toEqual(launchpadParams.tokenMaster.toString())
        expect((await launchpad.getParams()).saleEnd.toString()).toEqual(saleEnd.toString())
        expect((await launchpad.getParams()).saleStart.toString()).toEqual(saleStart.toString())

        expect(((await launchpad.getOwner()).toString())).toEqual(deployer.address.toString())

    });

    it('should throw LAUNCHPAD_VALUE_LESS_THEN_MIN_PURCHASE', async () => {
        const tokenBuy: TokenBuy = {
            $$type: "TokenBuy",
            queryId: 1n
        }
        const sendResult = await launchpad.send(sender.getSender(), {
            value: toNano(5) 
        }, tokenBuy)

        expect(sendResult.transactions).toHaveTransaction({
            exitCode: 3000
        });
        
    });

    it('should throw LAUNCHPAD_VALUE_GREATER_THEN_MAX_PURCHASE', async () => {
        const tokenBuy: TokenBuy = {
            $$type: "TokenBuy",
            queryId: 1n
        }
        const sendResult = await launchpad.send(sender.getSender(), {
            value: toNano(101) 
        }, tokenBuy)

        expect(sendResult.transactions).toHaveTransaction({
            exitCode: 3001
        });
        
    });

    it('should throw LAUNCHPAD_SALE_NOT_STARTED_YET', async () => {
        const newParams: LaunchpadParams = launchpadParams
        const date = new Date()
        newParams.saleStart = BigInt(date.setDate(date.getDate() + 1))
        newParams.saleEnd = BigInt(date.setDate(date.getDate() + 2))

        await launchpad.send(
            deployer.getSender(), {
                value: toNano(0.05) 
            },
            {
                $$type: "SetLaunchpadParams",
                params: newParams
            }
        )

        expect((await launchpad.getParams()).saleEnd.toString()).toEqual(newParams.saleEnd.toString())
        expect((await launchpad.getParams()).saleStart.toString()).toEqual(newParams.saleStart.toString())

        const tokenBuy: TokenBuy = {
            $$type: "TokenBuy",
            queryId: 1n
        }

        const sendResult = await launchpad.send(sender.getSender(), {
            value: toNano(50) 
        }, tokenBuy)

        expect(sendResult.transactions).toHaveTransaction({
            exitCode: 3002
        });
        
    });

    it('should throw LAUNCHPAD_SALE_ENDED', async () => {
        const newParams: LaunchpadParams = launchpadParams
        const date = new Date()
        newParams.saleStart = BigInt(Math.floor(date.setDate(date.getDate() - 3) / 1000))
        newParams.saleEnd = BigInt(Math.floor(date.setDate(date.getDate() - 2) / 1000))
        console.log(newParams.saleEnd, date.setDate(date.getDate() - 3), typeof date.setDate(date.getDate() - 3), Date.now());

        await launchpad.send(
            deployer.getSender(), {
                value: toNano(0.05) 
            },
            {
                $$type: "SetLaunchpadParams",
                params: newParams
            }
        )

        expect((await launchpad.getParams()).saleEnd.toString()).toEqual(newParams.saleEnd.toString())
        expect((await launchpad.getParams()).saleStart.toString()).toEqual(newParams.saleStart.toString())

        const tokenBuy: TokenBuy = {
            $$type: "TokenBuy",
            queryId: 1n
        }

        const sendResult = await launchpad.send(sender.getSender(), {
            value: toNano(50) 
        }, tokenBuy)

        expect(sendResult.transactions).toHaveTransaction({
            exitCode: 3003
        });
        
    });

    it('should correctly buy Tokens', async () => {
        launchpadParams.saleStart = BigInt(saleStart)
        launchpadParams.saleEnd = BigInt(saleEnd)

        await launchpad.send(
            deployer.getSender(), {
                value: toNano(0.05) 
            },
            {
                $$type: "SetLaunchpadParams",
                params: launchpadParams
            }
        )

        expect((await launchpad.getParams()).saleEnd.toString()).toEqual(launchpadParams.saleEnd.toString())
        expect((await launchpad.getParams()).saleStart.toString()).toEqual(launchpadParams.saleStart.toString())

        const raisedBefore = await launchpad.getTotalRaised()
        const countUsersBefore = await launchpad.getUsersCount()
        const amount = toNano(50)

        const tokenBuy: TokenBuy = {
            $$type: "TokenBuy",
            queryId: 1n
        }

        const sendResult = await launchpad.send(sender.getSender(), {
            value: amount
        }, tokenBuy)

        expect(sendResult.transactions).toHaveTransaction({
            from: sender.address,
            to: launchpad.address,
            success: true
        });

        const expectedClaimAmount = await launchpad.getCalculateClaim(
            amount
        )

        expect((await launchpad.getTotalRaised())).toEqual(raisedBefore + amount)
        expect((await launchpad.getUsersCount())).toEqual(countUsersBefore + 1n)
        expect((await launchpad.getUserInvest(sender.address))).toEqual(expectedClaimAmount)
        
    });

    it('should correctly buy Tokens by multiple users and claim', async () => {
        
        const SendersCount = 100
        
        const amount = toNano(11)
        const senders = []
        for (let i = 0; i < SendersCount; i++) {
            const sender = await blockchain.treasury('sender' + i);
            senders.push(sender)
            const raisedBefore = await launchpad.getTotalRaised()
            const countUsersBefore = await launchpad.getUsersCount()

            const tokenBuy: TokenBuy = {
                $$type: "TokenBuy",
                queryId: 1n
            }
            const sendResult = await launchpad.send(sender.getSender(), {
                value: amount
            }, tokenBuy)

            expect(sendResult.transactions).toHaveTransaction({
                from: sender.address,
                to: launchpad.address,
                success: true
            });

            const expectedClaimAmount = await launchpad.getCalculateClaim(
                amount
            )
    
            expect((await launchpad.getTotalRaised())).toEqual(raisedBefore + amount)
            expect((await launchpad.getUsersCount())).toEqual(countUsersBefore + 1n)
            expect((await launchpad.getUserInvest(sender.address))).toEqual(expectedClaimAmount)
        }
        const launchpadWallet = await 
        console.log(fromNano(((await blockchain.provider(launchpad.address).getState()).balance)));
        
        
        

        const walletAddress = await token.getGetWalletAddress(deployer.address);

        const setWalletResult = await launchpad.send(deployer.getSender(), {
            value: toNano(0.05) }, {
                $$type: "SetTokenWallet",
                wallet: walletAddress
            })

        expect(setWalletResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: launchpad.address,
            success: true
        });    

    });

});
