import OpenAI from 'openai';
import { httpsAgent } from '../config/config';

interface ChatCompletionParams {
  messages: any[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonResponse?: boolean;
}

export async function createChatCompletion({
  messages, 
  model = "gpt-4-1106-preview",
  jsonResponse = true,
}: ChatCompletionParams): Promise<any> {
  const openai = new OpenAI({
    httpAgent: httpsAgent,
  });

  const params: any = {
    messages,
    model,
    temperature: 0.55,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    response_format: undefined
  };
  
  if (jsonResponse) {
    params.response_format = {
      type: "json_object" 
    }
  }

  const completion = await openai.chat.completions.create(params, { httpAgent: httpsAgent });
  const {
    choices: [{message: {content}}]
  } = completion;
  if (!content) {
    throw new Error("No content in completion")
  }
  if (jsonResponse) {
    return JSON.parse(content);
  } else {
    return content;
  }
}
