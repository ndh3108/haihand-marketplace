const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('chatbot only returns products accepted as relevant', async () => {
  const book = { _id: 'book', title: 'Sách thiếu nhi', category: 'Sách & Văn phòng phẩm', score: 0.91 };
  const pen = { _id: 'pen', title: 'Bút bi', category: 'Sách & Văn phòng phẩm', score: 0.89 };
  let call = 0;
  class ChatOpenAI {
    async invoke() {
      return { content: [
        '{"intent":"search_product","semanticQuery":"sách"}',
        '{"indices":[0]}',
        'Mình đã tìm thấy sách phù hợp.'
      ][call++] };
    }
  }
  class OpenAIEmbeddings {
    async embedQuery() { return Array(1024).fill(0); }
  }
  class Message {
    constructor(content) { this.content = content; }
  }
  const Post = { aggregate: async () => [book, pen] };
  const dependencies = {
    '@langchain/openai': { ChatOpenAI, OpenAIEmbeddings },
    '@langchain/core/messages': { HumanMessage: Message, SystemMessage: Message, AIMessage: Message },
    '../models/Product': { Post },
    './imageEmbeddingService': { embedImage: async () => [] }
  };
  const source = fs.readFileSync(path.join(__dirname, '../services/chatbotService.js'), 'utf8');
  const module = { exports: {} };
  const load = vm.runInNewContext(`(function(require, module, process, console) { ${source}\n })`);
  load((name) => dependencies[name], module, { env: {} }, console);

  const result = await module.exports.processChatbot('Tìm sách');
  assert.deepEqual(Array.from(result.products, (product) => product._id), ['book']);
  assert.equal(call, 3);
});
