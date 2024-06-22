import "@stdlib/deploy";
import "./traits/whitelistable";


const SEND_JETTON_COST: Int = ton("0.05");
const MINIMAL_CONTRACT_BALANCE: Int = ton("0.01");
const CLAIM_COST: Int = ton("0.08");

const TON_DECIMALS: Int = 9;

const LAUNCHPAD_VALUE_LESS_THEN_MIN_PURCHASE: Int = 3000;
const LAUNCHPAD_VALUE_GREATER_THEN_MAX_PURCHASE: Int = 3001;
const LAUNCHPAD_SALE_NOT_STARTED_YET: Int = 3002;
const LAUNCHPAD_SALE_ENDED: Int = 3003;
const LAUNCHPAD_CLAIM_NOT_STARTED_YET: Int = 3004;
const LAUNCHPAD_GAS_TOO_SMALL: Int = 3005;
const LAUNCHPAD_USER_NOT_INVEST: Int = 3006;
const LAUNCHPAD_WALLET_NOT_SET: Int = 3007;
const LAUNCHPAD_MAX_CAP_REACHED: Int = 3008;


message TokenBuy {
    queryId: Int as uint64;
}

message Claim {
    queryId: Int as uint64;
}

message SetTokenWallet {
    wallet: Address;
}

message SetLaunchpadParams {
    params: LaunchpadParams;
}

struct TokenPrice {
    numerator: Int;
    denominator: Int;
}

struct LaunchpadParams {
    minCap: Int as coins;
    maxCap: Int as coins;
    minPurchase: Int as coins;
    maxPurchase: Int as coins;
    saleStart: Int;
    saleEnd: Int;
    tokenMaster: Address;
    tokenPrice: TokenPrice;
    tokenDecimals: Int;
}

contract Launchpad with Deployable, WhiteListable {
    
    params: LaunchpadParams;
    totalUsers: Int = 0;
    totalRaised: Int as coins = 0;
    tokenWallet: Address;
    users: map<Address, Int as uint256>;
    owner: Address;
    whiteList: map<Address, Bool>;
    whiteListEnable: Bool;

    init(params: LaunchpadParams, owner: Address, whiteListable: Bool) {
        self.params = params;
        self.owner = owner;
        self.tokenWallet = newAddress(0, 0);
        self.whiteListEnable = whiteListable;
    }

    receive(msg: TokenBuy) {
        let ctx: Context = context();

        self.requireInWhiteList(ctx.sender);

        nativeThrowUnless(LAUNCHPAD_MAX_CAP_REACHED, self.totalRaised < self.params.maxCap);
        nativeThrowUnless(LAUNCHPAD_VALUE_LESS_THEN_MIN_PURCHASE, ctx.value >= self.params.minPurchase);
        nativeThrowUnless(LAUNCHPAD_VALUE_GREATER_THEN_MAX_PURCHASE, ctx.value <= self.params.maxPurchase);
        nativeThrowUnless(LAUNCHPAD_SALE_NOT_STARTED_YET, self.isStarted());
        nativeThrowUnless(LAUNCHPAD_SALE_ENDED, !self.isEnded());
          

        nativeReserve(max(
            MINIMAL_CONTRACT_BALANCE,
            myBalance() - ctx.value
        ), 0);

        let investAmount: Int = self.calculateClaim(ctx.value);
        let userInvestAlready: Int? = self.users.get(ctx.sender);
        if (userInvestAlready != null) {
            investAmount = investAmount + userInvestAlready!!;
        }
        
        self.totalUsers = self.totalUsers + 1;
        self.totalRaised = self.totalRaised + ctx.value;
        
        self.users.set(ctx.sender, investAmount);
    }
    
    receive(msg: SetTokenWallet) {
        self.requireOwner();
        self.tokenWallet = msg.wallet;
    }

    receive(msg: SetLaunchpadParams) {
        self.requireOwner();
        self.params = msg.params;
    }

    receive("withdraw"){
        self.requireOwner();
        nativeReserve(
            MINIMAL_CONTRACT_BALANCE
        , 0);

        send(SendParameters
        {
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance,
            bounce: false
        });
    }

    receive(msg: Claim) {
        let ctx: Context = context();

        self.requireInWhiteList(ctx.sender);

        nativeThrowUnless(LAUNCHPAD_CLAIM_NOT_STARTED_YET, self.isEnded());
        nativeThrowUnless(LAUNCHPAD_GAS_TOO_SMALL, ctx.value >= CLAIM_COST);
        nativeThrowUnless(LAUNCHPAD_USER_NOT_INVEST, self.users.get(ctx.sender) != null);
        nativeThrowUnless(LAUNCHPAD_WALLET_NOT_SET, self.tokenWallet != newAddress(0, 0));
        
        let claim_amount: Int = self.users.get(ctx.sender)!!;
        

        send(SendParameters{
                to: self.tokenWallet,
                value: SEND_JETTON_COST,
                mode: SendPayGasSeparately | SendIgnoreErrors,
                body: beginCell().storeUint(0xf8a7ea5, 32).storeUint(msg.queryId, 64).storeCoins(claim_amount).storeSlice(ctx.sender.asSlice()).storeSlice(self.owner.asSlice()).storeUint(0, 1).storeCoins(0).storeUint(0, 1).endCell()
            });

        self.users.set(ctx.sender, null);
    }

    fun pow(a: Int, c: Int): Int {
        let res: Int = 1;
        repeat(c) {
            res *= a;
        }
        return res;
    }

    get fun calculateClaim(amount: Int): Int {
        return amount * (self.params.tokenPrice.numerator) / (self.params.tokenPrice.denominator) * self.pow(10, self.params.tokenDecimals - TON_DECIMALS);
    }

    get fun params(): LaunchpadParams {
        return self.params;
    }

    get fun isStarted(): Bool {
        return now() > self.params.saleStart;
    }

    get fun isEnded(): Bool {
        return now() > self.params.saleEnd;
    }

    get fun totalRaised(): Int {
        return self.totalRaised;
    }

    get fun usersCount(): Int {
        return self.totalUsers;
    }

    get fun userInvest(target: Address): Int? {
        return self.users.get(target);
    }

}
