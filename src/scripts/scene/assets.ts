import { DataTexture, LinearMipmapLinearFilter, LinearFilter, LoadingManager, RepeatWrapping, type Group, type Texture, type WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { generateNoise, generatePaper, generateStrokes, type RGBAImage } from './texgen';

/**
 * Loaders + cache. Textures are KTX2 (Basis), models are glTF with Meshopt
 * (Draco decoder wired up too, for any Draco-compressed models you add).
 */
export function createAssets(renderer: WebGLRenderer, manager = new LoadingManager()) {
  // No setTranscoderPath/setDecoderPath: three r18x references its own
  // version-matched Basis/Draco WASM via import.meta.url, which Vite emits
  // as hashed, long-cacheable files.
  const ktx2 = new KTX2Loader(manager).detectSupport(renderer);
  const draco = new DRACOLoader(manager);
  const gltf = new GLTFLoader(manager).setKTX2Loader(ktx2).setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);

  const textures = new Map<string, Promise<Texture>>();
  const models = new Map<string, Promise<Group>>();

  return {
    manager,
    texture(url: string): Promise<Texture> {
      if (!textures.has(url)) {
        textures.set(
          url,
          ktx2.loadAsync(url).then((t) => {
            t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
            return t;
          }),
        );
      }
      return textures.get(url)!;
    },
    /** Resolves to a fresh clone of the model's scene each call. */
    async model(url: string): Promise<Group> {
      if (!models.has(url)) models.set(url, gltf.loadAsync(url).then((g) => g.scene));
      const scene = await models.get(url)!;
      return scene.clone(true);
    },
  };
}
export type Assets = ReturnType<typeof createAssets>;

/** CPU-generated textures: the noise lookup, and fallbacks for the KTX2 base textures. */
export function proceduralTexture(kind: 'paper' | 'strokes' | 'noise'): Texture {
  const img: RGBAImage = kind === 'paper' ? generatePaper(256) : kind === 'noise' ? generateNoise(256) : generateStrokes(512);
  const t = new DataTexture(img.data, img.width, img.height);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
