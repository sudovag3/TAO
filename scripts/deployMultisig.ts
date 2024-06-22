import { Address, toNano } from '@ton/core';
import { SafeDeployerContract } from '../wrappers/SafeDeployerContract';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // const safeDeployerContract = provider.open(await SafeDeployerContract.fromInit(
    //     provider.sender().address!,
    //     toNano("0.0001"),
    //     toNano(0.1)
    // ));

    const safeDeployerContract = provider.open(await SafeDeployerContract.fromAddress(Address.parse('EQAwfYeLceiBLe226tbMKocJBtM46mcVG2NXin6P7OG0CmvK')));

    //
    await safeDeployerContract.send(
        provider.sender(),
        {
            value: toNano('0.2'),
        },
        "Deploy new Safe"
    );
    // run methods on `multisig`
}
