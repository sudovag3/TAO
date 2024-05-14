import { Address, toNano } from '@ton/core';
import { Launchpad } from '../wrappers/Launchpad';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Launchpad address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const launchpad = provider.open(Launchpad.fromAddress(address));

    const counterBefore = await launchpad.getCounter();

    await launchpad.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Add',
            queryId: 0n,
            amount: 1n,
        }
    );

    ui.write('Waiting for counter to increase...');

    let counterAfter = await launchpad.getCounter();
    let attempt = 1;
    while (counterAfter === counterBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        counterAfter = await launchpad.getCounter();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Counter increased successfully!');
}
