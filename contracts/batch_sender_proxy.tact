import "@stdlib/deploy";

message Add {
    queryId: Int as uint64;
    amount: Int as uint32;
}

contract BatchSenderProxy with Deployable {
    id: Int as uint32;
    counter: Int as uint32;
    sendInfo: map<Int, TokenSendInfo>;

    init(id: Int, inputSend: sendInfo) {
        self.id = id;
        self.counter = 0;
        self.sendInfo = inputSend;
    }

    receive(msg: Add) {
        self.counter += msg.amount;
    }

    get fun counter(): Int {
        return self.counter;
    }

    get fun id(): Int {
        return self.id;
    }
}
