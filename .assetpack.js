import { pixiPipes } from "@assetpack/core/pixi";
import { webfont } from "@assetpack/core/webfont";
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
    output: './public/assets',
    cache: true,
    pipes: [
        ...pixiPipes({
            texturePacker: {
                removeFileExtension: true,
                addFrameNames: true,
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