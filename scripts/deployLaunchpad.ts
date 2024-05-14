import { toNano } from '@ton/core';
import { Launchpad } from '../wrappers/Launchpad';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const launchpad = provider.open(await Launchpad.fromInit(BigInt(Math.floor(Math.random() * 10000))));

    await launchpad.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(launchpad.address);

    console.log('ID', await launchpad.getId());
}
