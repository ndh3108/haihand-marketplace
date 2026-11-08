require('dotenv').config();

const mongoose = require('mongoose');
const { Post } = require('../models/Product');
const { buildProductText, describeImage, embeddings, EMBEDDING_MODEL } = require('../services/chatbotService');
const { embedImage, IMAGE_EMBEDDING_MODEL } = require('../services/imageEmbeddingService');

async function imageAsDataUrl(url) {
  if (!url || process.env.RAG_INDEX_IMAGES === 'false') return '';
  if (url.startsWith('data:image/')) return url;
  if (!/^https?:\/\//i.test(url)) return '';

  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Không tải được ảnh: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Ảnh vượt quá 5 MB');
  const responseType = response.headers.get('content-type') || '';
  const type = responseType.startsWith('image/') ? responseType : 'image/jpeg';
  return `data:${type};base64,${bytes.toString('base64')}`;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGO_URI hoặc MONGODB_URI trong backend/.env');

  await mongoose.connect(uri);
  const filter = { status: { $in: ['active', 'APPROVED'] } };
  if (process.env.RAG_IMAGE_MISSING_ONLY === 'true') {
    filter.imageEmbedding = { $exists: false };
  }
  const products = await Post.find(filter)
    .select('+textEmbedding +embeddingModel +imageEmbedding +imageEmbeddingModel title name category condition location description details images')
    .lean();

  const prepared = [];
  for (const product of products) {
    let imageDescription = '';
    let imageEmbedding;
    let image = '';
    try {
      image = await imageAsDataUrl(product.images?.[0]);
    } catch (error) {
      console.warn(`Không tải được ảnh ${product._id}: ${error.message}`);
    }
    if (image) {
      try {
        imageDescription = await describeImage(image);
      } catch (error) {
        console.warn(`Không mô tả được ảnh ${product._id}: ${error.message}`);
      }
      try {
        imageEmbedding = await embedImage(image);
      } catch (error) {
        console.warn(`Không tạo được image embedding ${product._id}: ${error.message}`);
      }
    }
    prepared.push({ product, text: buildProductText(product, imageDescription), imageEmbedding });
    if (prepared.length % 5 === 0 || prepared.length === products.length) {
      console.log(`Đã chuẩn bị ${prepared.length}/${products.length} sản phẩm`);
    }
  }

  const batchSize = 16;
  for (let start = 0; start < prepared.length; start += batchSize) {
    const batch = prepared.slice(start, start + batchSize);
    const texts = batch.map((item) => item.text);
    const vectors = await embeddings.embedDocuments(texts);
    await Post.bulkWrite(batch.map(({ product, imageEmbedding }, index) => {
      const fields = { ragText: texts[index], textEmbedding: vectors[index], embeddingModel: EMBEDDING_MODEL };
      if (imageEmbedding) {
        fields.imageEmbedding = imageEmbedding;
        fields.imageEmbeddingModel = IMAGE_EMBEDDING_MODEL;
      }
      return {
        updateOne: {
          filter: { _id: product._id },
          update: { $set: fields }
        }
      };
    }));
    console.log(`Đã lập embedding ${Math.min(start + batch.length, prepared.length)}/${prepared.length} sản phẩm`);
  }

  console.log(`Hoàn tất text=${EMBEDDING_MODEL}, image=${IMAGE_EMBEDDING_MODEL}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
