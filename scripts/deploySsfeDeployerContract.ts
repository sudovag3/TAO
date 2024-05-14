import { toNano } from '@ton/core';
import { SsfeDeployerContract } from '../wrappers/SsfeDeployerContract';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ssfeDeployerContract = provider.open(await SsfeDeployerContract.fromInit());

    await ssfeDeployerContract.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(ssfeDeployerContract.address);

    // run methods on `ssfeDeployerContract`
}
