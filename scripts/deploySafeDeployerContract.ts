import { toNano } from '@ton/core';
import { SafeDeployerContract } from '../wrappers/SafeDeployerContract';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const safeDeployerContract = provider.open(await SafeDeployerContract.fromInit());

    await safeDeployerContract.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(safeDeployerContract.address);

    // run methods on `safeDeployerContract`
}
