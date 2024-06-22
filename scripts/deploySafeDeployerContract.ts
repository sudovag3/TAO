import { toNano } from '@ton/core';
import { SafeDeployerContract } from '../wrappers/SafeDeployerContract';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const safeDeployerContract = provider.open(await SafeDeployerContract.fromInit(
        provider.sender().address!,
        toNano("0.0001"),
        toNano(0.1)
    ));

    await safeDeployerContract.send(
        provider.sender(),
        {
            value: toNano('0.15'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(safeDeployerContract.address);

    const params = await safeDeployerContract.getParams()
    console.log(JSON.stringify(params));
    
    // run methods on `safeDeployerContract`
}
