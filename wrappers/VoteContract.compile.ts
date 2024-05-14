import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/safe/vote.tact',
    options: {
        external: true
    }
};
