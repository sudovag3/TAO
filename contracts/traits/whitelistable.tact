import "@stdlib/deploy";
import "@stdlib/ownable";

trait Trackable with Ownable {


    owner: Address;
    whiteList: map<Address, Bool>;           // your new trait may add state variables but should not specify their size

    // Receivers

    receive("reset whitelist") {
        self.requireOwner();
        self.whiteList = emptyMap();
        self.reply("reset done".asComment());
    }

    // Getters

    get fun inWhiteList(target: Address): Bool {              // your new trait may add getters
        if (self.whiteList.get(target) != null) {
            return self.whiteList.get(target);
        }
        return false;
    }

    // Methods

    fun receivedNewMessage() {          // your new trait may define new contract methods
        if (self.filterMessage()) {
            self.numMessagesReceived = self.numMessagesReceived + 1;
        }
    }

    virtual fun filterMessage(): Bool { // virtual functions can be overridden by users of this trait
        // the default filtering behavior is to ignore messages sent by the owner
        if (sender() == self.owner) {
            return false;
        }
        return true;
    }
}