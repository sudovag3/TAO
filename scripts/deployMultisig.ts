import { toNano } from '@ton/core';
import { Multisig } from '../wrappers/Multisig';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const multisig = provider.open(await Multisig.fromInit());

    await multisig.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(multisig.address);

    // run methods on `multisig`
}
