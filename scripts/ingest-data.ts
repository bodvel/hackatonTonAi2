import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeStore } from 'langchain/vectorstores';
import { Document } from 'langchain/document';
import { pinecone } from '@/utils/pinecone-client';
import { CustomPDFLoader } from '@/utils/customPDFLoader';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { DirectoryLoader } from 'langchain/document_loaders';
import axios from "axios";

/* Name of directory to retrieve your files from */
/*
const filePath = 'docs';

export const run = async () => {
  try {
    //load raw docs from the all files in the directory
    const directoryLoader = new DirectoryLoader(filePath, {
      '.pdf': (path) => new CustomPDFLoader(path),
    });

    // const loader = new PDFLoader(filePath);
    const rawDocs = await directoryLoader.load();

    // Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log('split docs', docs);

    console.log('creating vector store...');
    //create and store the embeddings in the vectorStore
    const embeddings = new OpenAIEmbeddings();
    const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name

    //embed the PDF documents
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace: PINECONE_NAME_SPACE,
      textKey: 'text',
    });
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};

*/
const apiUrl = "https://courtpractice.searcher.api.zakononline.com.ua/v1/document/by/id/";
const apiKey = "BAD16Q-RZ0ZRG-LA$FAP-BQLOPE-AS361O-%^ASD1-VMD2AS-HS2(2!";

export const run = async () => {
  let rawDocs;
  for (let i =2387;i<22000;i++){

  try {


    // Fetch JSON data from the API with the API key in the header
    const response = await axios.get(apiUrl+i, {
      headers: {
        "X-App-Token": apiKey
      }
    });





    function removeHTMLTags(textHTML:string) {
      const regex = /<[^>]+>/g;
      return textHTML.replace(regex, '');
    }

    rawDocs = removeHTMLTags(response.data[0].text.toString());
//console.log(response.data[0].text);
    // Extract the relevant properties from the JSON response
   // const docsPre = rawDocs.map((doc: { text: any; }) => ({
    //  text: doc.text // Adjust to the appropriate text property from the JSON
      // Add more properties if needed for your specific use case
    //}));

    let documents = new Document({pageContent:rawDocs,metadata:{"source": "/docs/"+i+".pdf"}});


    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments([documents]);

    console.log("split docs", docs);

    console.log("creating vector store...");
    // Create and store the embeddings in the vectorStore
    const embeddings = new OpenAIEmbeddings();
    const index = pinecone.Index(PINECONE_INDEX_NAME); // Change to your own index name

    // Embed the JSON documents
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace: PINECONE_NAME_SPACE,
      textKey: "text"
    });


  } catch (error) {
    console.log("error", error);
    //throw new Error("Failed to ingest your data");
  }
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();




