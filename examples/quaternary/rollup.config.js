import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy'
import { getBabelOutputPlugin } from '@rollup/plugin-babel';

export default [
    {
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/index.js'
            }
        ],
        plugins: [
            resolve(),
            typescript({ target: 'esnext', declaration: false }),
            getBabelOutputPlugin({ presets: ['@babel/preset-env'] }),
            copy({
                targets: [
                    { src: 'src/index.html', dest: 'dist' },
                    { src: '../data/samples.json', dest: 'dist' },
                ]
            })
        ]
    }
]