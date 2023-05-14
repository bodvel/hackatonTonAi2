import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeStore } from 'langchain/vectorstores';
import { makeChain } from '@/utils/makechain';
import { makeChain2 } from '@/utils/makechain2';
import { pinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  let pageNew: {
    pageContent: string;
    url: any;
    id: string}[] = [];
  let text_v = "";
  let text_visnov = "";

 
  const { question, history } = req.body;

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }
  // OpenAI recommends replacing newlines with spaces for best results
  let sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  const index = pinecone.Index(PINECONE_INDEX_NAME);

  /* create vectorstore*/
  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings({}),
    {
      pineconeIndex: index,
      textKey: 'text',
      namespace: PINECONE_NAME_SPACE,
    },
  );

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  const sendData = (data: string) => {
    res.write(`data: ${data}\n\n`);
  };

  sendData(JSON.stringify({ data: '' }));

  //create chain
  const chain = makeChain(vectorStore, (token: string) => {
    sendData(JSON.stringify({ data: token }));
  });

  // 2 chain
  const chain2 = makeChain2(vectorStore, (token: string) => {
    sendData(JSON.stringify({ data: token , key: 1}));
  });



    console.log('start');
    const response2 = await chain2.call({
      question: sanitizedQuestion,
      chat_history: history || [],
    });
    //console.log('sanitizedQuestion', sanitizedQuestion);
    console.log('response2', response2);

      async function fetchData1(arr: { metadata: { source: { match: (arg0: RegExp) => any[]; }; }; }[]) {


            for (let i=0;i<response2.sourceDocuments.length;i++){
            let id_res = arr[i].metadata.source.match(/\/docs\/(.*?)\.pdf/)?.[1];
              const url1 = "https://courtpractice.searcher.api.zakononline.com.ua/v1/document/by/id/"+id_res;
              const headers = {
                "X-App-Token": "BAD16Q-RZ0ZRG-LA$FAP-BQLOPE-AS361O-%^ASD1-VMD2AS-HS2(2!"
              };

              try {
              const response = await fetch(url1, { headers });
              const data = await response.json();

              if(!pageNew.some(obj => obj.id === id_res)){
                text_visnov = text_visnov + (i+1) + ") " + data[0].text.match(/<strong>Висновки:<\/strong>(.*?)<\/p>/)?.[1]+"\n";
                console.log("text_visnov", text_visnov);

                pageNew.push({
                  pageContent: "Висновок: "+data[0].text.match(/<strong>Висновки:<\/strong>(.*?)<\/p>/)?.[1]+"\n",
                  url: "https://zakononline.com.ua/court-practice/show/"+id_res,
                  id: id_res
                })
              }

            } catch (error) {
              console.log("Произошла ошибка:", error);
            }
          }}

      await fetchData1(response2.sourceDocuments);
      console.log("pageNew", pageNew)











  try {
    //Ask a question
    sanitizedQuestion = sanitizedQuestion+"\n=========\n"+text_visnov;
    const response = await chain.call({
      question: sanitizedQuestion,
      chat_history: history || [],
    });
    console.log('sanitizedQuestion', sanitizedQuestion);
    console.log('response', response);





/*
    async function fetchData() {
      const url = "https://courtpractice.searcher.api.zakononline.com.ua/v1/document/by/id/11439";
      const headers = {
        "X-App-Token": "BAD16Q-RZ0ZRG-LA$FAP-BQLOPE-AS361O-%^ASD1-VMD2AS-HS2(2!"
      };

      try {
        const response = await fetch(url, { headers });
        const data = await response.json();

        text_v = data[0].text.match(/<strong>Висновки:<\/strong>(.*?)<\/p>\r\n<p style="text-align: justify;"><strong>Ключові слова: <\/strong>/)?.[1];
        console.log(text_v);
      } catch (error) {
        console.log("Произошла ошибка:", error);
      }
    }
       await fetchData();
 */


    response.sourceDocuments = [];
    for (let i=0;i< pageNew.length;i++){
      response.sourceDocuments.push(
          {
            pageContent: pageNew[i].pageContent,
            metadata:{
              source: pageNew[i].url,
              pdf_numpages: 2
            }
          }
      )


      //response.sourceDocuments[i].pageContent =  pageNew[i].pageContent;
      //response.sourceDocuments[i].metadata.source = pageNew[i].url;
    }
    

    //console.log('response', text.match(/<strong>Висновки:<\/strong>(.*?)<\/p>\r\n<p style="text-align: justify;"><strong>Ключові слова: <\/strong>/)?.[1]);
    
    //response.sourceDocuments[0].metadata.source = "[https://zakononline.com.ua/court-practice/show/11439](https://zakononline.com.ua/court-practice/show/11439)";
    //response.text = response.text+"\n\n\n**Висновок:** "+text_v+"\nhttps://zakononline.com.ua/court-practice/show/11439";
    sendData(JSON.stringify({ sourceDocs: response.sourceDocuments}));
  } catch (error) {
    console.log('error', error);
  } finally {
    console.log('[DONE]1');
    sendData('[DONE]');
    res.end();
  }
}
