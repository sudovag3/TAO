import { toNano, address, Dictionary, Address } from '@ton/core';
import { SafeContract, SafeOperation, SafeRequestOperation } from '../wrappers/SafeContract';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {

    const multisigAddress = "kQCT3YGs0pK29jXTc0mpW1SaucmTJEYMhvHNrxDGFQIE6gLj"
    const potentionalOwnerAddress = "0QASOsDUCrM2-VHxkU_JIrknmyswIn0TtIGRzSKGB8VByU78"
    const safeContract = provider.open(await SafeContract.fromAddress(address(multisigAddress)));
    const newOwner = Address.parse("UQDgL5F5pAquNcR_h2mH3qNgcAOAEZiZ5JO9CiYjaaSCiSbf")
    const params = await safeContract.getParameters()
    const owners = await safeContract.getOwners()
    const treshold = await safeContract.getTreshold()
    const seqno = await safeContract.getSeqno()
    console.log(`
    MULTISIG CONTRACT - ${multisigAddress}
    1000000000
    Treshold - ${treshold}
    Seqno - ${seqno}
    Timeout - ${params.timeout}
    RequestPrice - ${params.requestPrice}
    Is ${potentionalOwnerAddress} is owner - ${owners.get(address(potentionalOwnerAddress))}
    `);
    
    let operation: SafeOperation = {
        $$type : "SafeOperation",
        transfer:  null,
        parameters:null,
        add:  {
            $$type: 'SafeOperationAdd',
            owner: newOwner
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
    // blockchain.now = Date.now();
    
    const deployVoteResult = await safeContract.send(provider.sender(), {
                value: toNano(0.101)
    }, args)

    // run methods on `multisig`
}
