import { OpenAIChat } from 'langchain/llms';
import { LLMChain, ChatVectorDBQAChain, loadQAChain } from 'langchain/chains';
import { PineconeStore } from 'langchain/vectorstores';
import { PromptTemplate } from 'langchain/prompts';
import { CallbackManager } from 'langchain/callbacks';


const CONDENSE_PROMPT =
  PromptTemplate.fromTemplate(`Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`);


const QA_PROMPT = PromptTemplate.fromTemplate(
  `Ви - асистент ШІ, який надає корисні поради. Вам надано уривки з довгого документа та запитання. Надайте діалогову відповідь на основі наданого контексту.
Ви повинні надавати лише ті гіперпосилання, які посилаються на контекст, наведений нижче. НЕ вигадуйте гіперпосилання.
Якщо ви не можете знайти відповідь у наведеному нижче контексті, просто скажіть "Хм, я не впевнений". Не намагайтеся вигадувати відповідь.
Якщо питання не пов'язане з контекстом, ввічливо скажіть, що ви налаштовані відповідати лише на ті питання, які пов'язані з контекстом.

Питання: {question}

{context}
=========
Відповідь у Markdown:`,
);



export const makeChain = (
  vectorstore: PineconeStore,
  onTokenStream?: (token: string) => void,
) => {
  const questionGenerator = new LLMChain({
    llm: new OpenAIChat({ temperature: 0 }),
    prompt: CONDENSE_PROMPT,
  });

    const docChain = loadQAChain(
    new OpenAIChat({
      temperature: 0,
      modelName: 'gpt-3.5-turbo', //change this to older versions (e.g. gpt-3.5-turbo) if you don't have access to gpt-4
      streaming: Boolean(onTokenStream),
      callbackManager: onTokenStream
        ? CallbackManager.fromHandlers({
            async handleLLMNewToken(token) {
              onTokenStream(token);
              console.log(token);
            },
          })
        : undefined,
    }),
    { prompt: QA_PROMPT },
  );

  return new ChatVectorDBQAChain({
    vectorstore,
    combineDocumentsChain: docChain,
    questionGeneratorChain: questionGenerator,
    returnSourceDocuments: true,
    k: 3, //number of source documents to return
  });
};
