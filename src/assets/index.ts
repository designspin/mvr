import {
    Assets,
    extensions,
    ExtensionType,
    resolveTextureUrl,
    ResolveURLParser,
    Resolver,
    UnresolvedAsset,
} from 'pixi.js';

import manifest from '../manifest.json';

export const resolveJsonUrl = {
    extension: ExtensionType.ResolveParser,
    test: (value: string): boolean =>
    Resolver.RETINA_PREFIX.test(value) && value.endsWith('.json'),
    parse: resolveTextureUrl.parse,
} as ResolveURLParser;

extensions.add(resolveJsonUrl);

export async function initAssets()
{
    await Assets.init({ manifest, basePath: 'assets' });

    logAvailableBundles();
    await Assets.loadBundle(['preload', 'default', 'pause-overlay']);

    const allBundles = manifest.bundles.map((item) => item.name);
    
    Assets.backgroundLoadBundle(allBundles);
}

function logAvailableBundles() {
    console.log('Available bundles:', manifest.bundles.map(b => b.name));
}

export function isBundleLoaded(bundle: string)
{
    const bundleManifest = manifest.bundles.find((b) => b.name === bundle);

    if (!bundleManifest)
    {
        return false;
    }

    for (const asset of bundleManifest.assets as UnresolvedAsset[]) {
        if (!Assets.cache.has(asset.alias as string)) {
            return false;
        }
    }

    return true;
    
    // for (const asset of bundleManifest.assets as UnresolvedAsset[])
    // {
    //     const aliases = Array.isArray(asset.alias) ? asset.alias : [asset.alias];
        
    //     const hasAnyAlias = aliases.some(alias => Assets.cache.has(alias));
        
    //     if (!hasAnyAlias)
    //     {
    //         return false;
    //     }
    // }

    // return true;
}

export function areBundlesLoaded(bundles: string[])
{
    for (const name of bundles)
    {
        const loaded = isBundleLoaded(name);
        if (!loaded)
        {
            return false;
        }
    }

    return true;
}