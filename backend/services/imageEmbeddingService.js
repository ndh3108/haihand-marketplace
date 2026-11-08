const path = require('path');

const IMAGE_EMBEDDING_MODEL = process.env.IMAGE_EMBEDDING_MODEL || 'Xenova/siglip-base-patch16-224';
const IMAGE_EMBEDDING_DTYPE = process.env.IMAGE_EMBEDDING_DTYPE || 'q8';

let runtimePromise;

async function runtime() {
  if (!runtimePromise) {
    runtimePromise = import('@huggingface/transformers').then(async ({
      env,
      AutoProcessor,
      SiglipVisionModel,
      RawImage
    }) => {
      env.cacheDir = process.env.SIGLIP_CACHE_DIR || path.join(process.cwd(), '.cache', 'huggingface');
      const [processor, model] = await Promise.all([
        AutoProcessor.from_pretrained(IMAGE_EMBEDDING_MODEL),
        SiglipVisionModel.from_pretrained(IMAGE_EMBEDDING_MODEL, { dtype: IMAGE_EMBEDDING_DTYPE })
      ]);
      return { processor, model, RawImage };
    });
  }
  try {
    return await runtimePromise;
  } catch (error) {
    runtimePromise = undefined;
    throw error;
  }
}

function normalize(values) {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!norm) throw new Error('SigLIP trả về vector rỗng');
  return values.map((value) => value / norm);
}

async function embedImage(source) {
  if (!source) throw new Error('Thiếu ảnh để tạo image embedding');
  const { processor, model, RawImage } = await runtime();
  const dataUrl = typeof source === 'string'
    ? source.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s)
    : null;
  let imageSource = source;
  if (dataUrl) {
    imageSource = new Blob([Buffer.from(dataUrl[2], 'base64')], { type: dataUrl[1] });
  } else if (typeof source === 'string' && /^https?:\/\//i.test(source)) {
    const response = await fetch(source, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Không tải được ảnh: HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('Ảnh vượt quá 5 MB');
    const responseType = response.headers.get('content-type') || '';
    imageSource = new Blob([bytes], { type: responseType.startsWith('image/') ? responseType : 'image/jpeg' });
  }
  const image = await RawImage.read(imageSource);
  const inputs = await processor(image);
  const { pooler_output: output } = await model(inputs);
  return normalize(Array.from(output.data, Number));
}

async function indexProductImage(product) {
  const source = product?.images?.[0];
  if (!source) return false;
  product.imageEmbedding = await embedImage(source);
  product.imageEmbeddingModel = IMAGE_EMBEDDING_MODEL;
  await product.save();
  return true;
}

module.exports = {
  embedImage,
  indexProductImage,
  IMAGE_EMBEDDING_MODEL
};
