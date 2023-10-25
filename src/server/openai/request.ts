import { OpenAI } from "openai";
import { encodingForModel } from "tiktoken-node";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CONTEXT_WINDOW = {
  "gpt-4-0613": 8192,
};
type Model = keyof typeof CONTEXT_WINDOW;

export const getMaxTokensForResponse = async (
  inputText: string,
  model: Model,
): Promise<number> => {
  try {
    const enc = encodingForModel(model);
    const tokens = enc.encode(inputText);
    const numberOfInputTokens = tokens.length;

    const maxContextTokens = CONTEXT_WINDOW[model];
    const padding = Math.ceil(maxContextTokens * 0.01);

    const maxTokensForResponse =
      maxContextTokens - numberOfInputTokens - padding;

    if (maxTokensForResponse <= 0) {
      throw new Error(
        "Input text is too large to fit within the context window.",
      );
    }

    return maxTokensForResponse;
  } catch (error) {
    console.log("Error in getMaxTokensForResponse: ", error);
    return Math.round(CONTEXT_WINDOW[model] / 2);
  }
};

export const sendGptRequest = async (
  userPrompt: string,
  systemPrompt = "You are a helpful assistant.",
  temperature = 0.2,
  retries = 10,
  delay = 60000, // rate limit is 40K tokens per minute, so by default start with 60 seconds
) => {
  console.log("\n\n --- User Prompt --- \n\n", userPrompt);
  console.log("\n\n --- System Prompt --- \n\n", systemPrompt);

  const model = "gpt-4-0613";

  try {
    const max_tokens = await getMaxTokensForResponse(
      userPrompt + systemPrompt,
      model,
    );

    console.log(`\n +++ Calling ${model} with max_tokens: ${max_tokens} `);
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens,
      temperature,
    });
    const endTime = Date.now();
    console.log(`\n +++ ${model} Response time ${endTime - startTime} ms`);

    const gptResponse = response.choices[0].message;
    return gptResponse.content;
  } catch (error) {
    if (
      retries === 0 ||
      (error as { response?: Response })?.response?.status !== 429
    ) {
      console.error(`Error in GPT request: ${error}`);
      throw error;
    } else {
      console.log(
        `Received 429, retries remaining: ${retries}. Retrying in ${delay} ms...`,
      );
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          sendGptRequest(
            userPrompt,
            systemPrompt,
            temperature,
            retries - 1,
            delay * 2,
          )
            .then(resolve)
            .catch(reject);
        }, delay);
      });
    }
  }
};
