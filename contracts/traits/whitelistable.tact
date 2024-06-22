import "@stdlib/deploy";
import "@stdlib/ownable";


message AddToWhiteList {
    target: Address;
}

message RemoveFromWhiteList {
    target: Address;
}

message SetWhiteListEnable {
    to: Bool;
}

const USER_IS_NOT_WHITELISTED: Int = 4000;



trait WhiteListable with Ownable {

    owner: Address;
    whiteList: map<Address, Bool>;
    whiteListEnable: Bool;
    // Receivers

    receive("reset whitelist") {
        self.requireOwner();
        self.whiteList = emptyMap();
        self.reply("reset done".asComment());
    }

    receive(msg: AddToWhiteList) {
        self.requireOwner();
        self.whiteList.set(msg.target, true);
    }

    receive(msg: RemoveFromWhiteList) {
        self.requireOwner();
        self.whiteList.set(msg.target, null);
    }

    receive(msg: SetWhiteListEnable) {
        self.requireOwner();
        self.whiteListEnable = msg.to;
    }

    // Getters

    get fun inWhiteList(target: Address): Bool { 
        if (self.whiteListEnable == true){
            if (self.whiteList.get(target) != null) {
                return self.whiteList.get(target)!!;
            }
            return false;
        } else {
            return true;
        }
    }

    get fun isWhiteListEnable(): Bool {
        return self.whiteListEnable;
    }

    fun requireInWhiteList(target: Address) {
        if (self.whiteListEnable == true){
            nativeThrowUnless(USER_IS_NOT_WHITELISTED, self.whiteList.get(target) == true);
        }
    }
}