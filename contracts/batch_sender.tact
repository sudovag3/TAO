import "@stdlib/deploy";
import "@stdlib/ownable";
import "@stdlib/stoppable";
import "./imports/stdlib1.fc";

const SEND_TON_COST: Int = ton("0.000309");
const SEND_TON_PROCESS: Int = ton("0.01");
const MINIMAL_CONTRACT_BALANCE: Int = ton("0.01");
const RESEND_VALUE: Int = ton("0.15");
const NOT_ENOUGTH_VALUE: Int = 1001;

@name(store_dict)
extends native storeDict(self: Builder, c: Cell): Builder;

struct DictLoadRes{
    slice: Slice;
    dict: Cell;
}

@name(load_dict)
extends native loadDict(self: Slice): DictLoadRes;

struct DictGetRes{
    slice: Slice;
    success: Int;
}

struct DictGetMinRes{
    key: Int;
    slice: Slice;
    success: Int;
}

struct DictGetNextRes{
    key: Int;
    slice: Slice;
    success: Int;
}

@name(udict_get?)
extends native udictGet(self: Cell, kl: Int, k: Int): DictGetRes;

@name(idict_get_min?)
extends native idictGetMin(self: Cell, kl: Int): DictGetNextRes;

@name(idict_get_next?)
extends native idictGetNext(self: Cell, kl: Int, p: Int): DictGetNextRes;

// @name(idict_get_max?)
// extends native udictGetMax(self: Cell, kl: Int): DictGetMinRes;


message(0x7362d09c) TokenNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    forward_payload: Slice as remaining;
}

message(0xf8a7ea5) TokenTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    response_destination: Address;
    custom_payload: Cell?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining; // Comment Text message when Transfer the jetton
}

struct TokenSendInfo {
    recipient: Address;
    value: Int;
}

message TokenSend {
    length: Int as uint64;
    tokenRoot: Address;
    sendInfo: map<Int, TokenSendInfo>;
}

message Send {
    queryId: Int as uint64;
    length: Int as uint64;
    sum: Int;
    sendInfo: map<Int, TokenSendInfo>;
    cursor: Int;
}





contract BatchSender with Deployable, Ownable, OwnableTransferable, Stoppable, Resumable {
    id: Int as uint32;
    send_cost: Int;
    owner: Address;
    stopped: Bool;

    init(id: Int, send_cost: Int) {
        self.owner = sender();
        self.stopped = false;
        self.id = id;
        self.send_cost = send_cost;
    }

    receive(msg: Send) {
        let ctx: Context = context();
        
        nativeReserve(max(
            MINIMAL_CONTRACT_BALANCE,
            myBalance() - ctx.value
        ), 0);
    

        
        let hasMore: Bool = true;
        let needBreak: Bool = false;
        let cursorStart: Int = msg.cursor;
        do {              
            if ((msg.sendInfo.get(msg.cursor)!!).value != 0) {
            send(SendParameters{
                to: (msg.sendInfo.get(msg.cursor)!!).recipient,
                value: SEND_TON_COST + (msg.sendInfo.get(msg.cursor)!!).value,
                mode: SendPayGasSeparately | SendIgnoreErrors,
                bounce: false
            });
            }
            msg.cursor = msg.cursor + 1;
        
            if (msg.sendInfo.get(msg.cursor) == null){
                hasMore = false;
                needBreak = true;
            }

            if (msg.cursor - cursorStart > 120) {
                needBreak = true;
            }
        } until (needBreak);
        if (hasMore){
            send(SendParameters{
                to: myAddress(),
                value: 0,
                mode: SendRemainingBalance,
                bounce: false,
                body: msg.toCell()
            });
            msg.sendInfo = emptyMap();
        }
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

    receive(msg: TokenNotification) {
        let ctx: Context = context();

        nativeReserve(max(
            MINIMAL_CONTRACT_BALANCE,
            myBalance() - ctx.value
        ), 0);
        //TODO
        //throw(122);

        // Send tokens
        //TODO Проверка кошелька!!!!!
        // let contentS : Slice = msg.forward_payload.beginParse();
        msg.forward_payload = msg.forward_payload.loadRef().beginParse();
        let meta_data: Slice = msg.forward_payload.loadRef().beginParse();
        // msg.forward_payload.refs() == 0
        // msg.forward_payload.bits() == 1
        // meta_data.refs() == 2
        //throw(1000 + 100 * meta_data.refs() + meta_data.bits());
        let length: Int = meta_data.loadUint(64);
        let from: Address = meta_data.loadAddress();
        
        // // if (ctx.value < length * (SEND_TON_PROCESS)){
        // //     self.transferJettonTo(ctx.sender, msg.from,
        // //         msg.amount, msg.queryId, "Not Enough Ton");
        // //     return;
        // // }

        let sendersContent: Slice = msg.forward_payload.loadRef().beginParse();
        
        nativeThrowUnless(905, sendersContent.loadUint(8) == 0);
        let contDict: DictLoadRes = sendersContent.loadDict();  
        
        nativeThrowUnless(906, contDict.dict != null);
        
        
        // let lockEndRes: DictGetMinRes = contDict.dict.idictGetMin(257);
        
        
        // let lockEndNextRes: DictGetNextRes = contDict.dict.udictGetNext(257, lockEndRes.key);

        // throw(lockEndNextRes.key + 1000);
        
        
        
        //let SendInfoSlice: Slice = lockEndNextRes.slice.loadRef().beginParse();
        //SendInfoSlice = SendInfoSlice.loadRef().beginParse();
        // let recipientA: Address = SendInfoSlice.loadAddress();
        // let amount: Int = SendInfoSlice.loadUint(256);
        
        
        // dump("hello");
        
        // let sendInfo: DictGetNextRes = contDict.dict.idictGetMin(257);
        // nativeThrowUnless(907, sendInfo.success == -1);

        // sendInfo = contDict.dict.idictGetNext(257, sendInfo.key);
        // nativeThrowUnless(907, sendInfo.success == -1);

        // sendInfo = contDict.dict.idictGetNext(257, sendInfo.key);
        // nativeThrowUnless(907, sendInfo.success == -1);

        // let SendInfoSlice: Slice = sendInfo.slice.loadRef().beginParse();
        // // SendInfoSlice = SendInfoSlice.loadRef().beginParse();
        
        // let recipient: Address = SendInfoSlice.loadAddress();
        // let amount: Int = SendInfoSlice.loadInt(257);

        // if (amount > 1000){
        //     throw(1234);
        // }

        let sendInfo: DictGetNextRes = contDict.dict.idictGetMin(257);
        nativeThrowUnless(907, sendInfo.success == -1);
        
        repeat(length){

            let SendInfoSlice: Slice = sendInfo.slice.loadRef().beginParse();
            //SendInfoSlice = SendInfoSlice.loadRef().beginParse();
            
            let recipient: Address = SendInfoSlice.loadAddress();
            let amount: Int = SendInfoSlice.loadInt(257);

            send(SendParameters{
                to: sender(),
                value: self.send_cost,
                mode: SendPayGasSeparately | SendIgnoreErrors,
                body: beginCell().storeUint(0xf8a7ea5, 32).storeUint(msg.queryId, 64).storeCoins(amount).storeSlice(recipient.asSlice()).storeSlice(self.owner.asSlice()).storeUint(0, 1).storeCoins(0).storeUint(0, 1).endCell()

                //body: TokenTransfer{queryId: msg.queryId, amount: amount, destination:recipient , response_destination: self.owner, custom_payload: null, forward_ton_amount: 0, forward_payload: emptySlice()}.toCell()
            });

            sendInfo = contDict.dict.idictGetNext(257, sendInfo.key);
            
        }

        send(
            SendParameters{
                to: msg.from,
                value: 0,
                mode: SendRemainingBalance + SendIgnoreErrors,
                body: "Finish".asComment()
            }
        );


    }




    fun transferJettonTo(jetton_wallet: Address, destination: Address, amount: Int, query_id: Int, message: String) {
        if (amount > 0) {
            send(SendParameters{
                to: jetton_wallet,
                value: 0,
                mode: SendRemainingValue,
                body: TokenTransfer{queryId: query_id, amount: amount, destination: destination, response_destination: destination, custom_payload: message.asComment(), forward_ton_amount: 0, forward_payload: emptySlice()}.toCell()
            });
        }
    }

    get fun id(): Int {
        return self.id;
    }

    
    get fun buildTokenSendPayload(msg: TokenSend): Cell {
        return beginCell().storeRef(
           beginCell().
           storeUint(msg.length, 64). // 
           storeAddress(msg.tokenRoot).
           endCell()
        ).storeRef(beginCell().storeUint(0,8).storeDict(msg.sendInfo.asCell()!!).endCell()).endCell();
    }

    get fun fullTonSendAddiction(length: Int): Int {
        return length * (SEND_TON_PROCESS) + (length / 120) * RESEND_VALUE;
    }

}