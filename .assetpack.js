import { pixiPipes } from "@assetpack/core/pixi";

// export default {
//     entry: './raw-assets',
//     output: './public/',
//     pipes: [
//     ...pixiPipes({
//         webfont: webfont(),
//         compressJpg: compressJpg(),
//         compressPng: compressPng(),
//         audio: audio(),
//         json: json(),
//         texture: pixiTexturePacker({
//             texturePacker: {
//                 removeFileExtension: true,
//             },
//         }),
//         manifest: pixiManifest({
//             output: './src/manifest.json',
//         }),
//     }),
//     ]
// };

export default {
    entry: './raw-assets',
    output: './public/',
    cache: true,
    pipes: [
        ...pixiPipes({
            cacheBust: false,
            texturePacker: {
                texturePacker: {
                    removeFileExtension: true,
                },
            },
            manifest: {
                output: './src/manifest.json',
            },
        }),
    ]
}