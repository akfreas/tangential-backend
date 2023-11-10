import OpenAI from 'openai';
import { httpsAgent } from '../config/config';

interface ChatCompletionParams {
  messages: any[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function createChatCompletion({
  messages,
  model = "gpt-4-1106-preview",
}: ChatCompletionParams): Promise<any> {
  const openai = new OpenAI({
    httpAgent: httpsAgent,
  });
 
  const completion = await openai.chat.completions.create({
    messages,
    model,
    temperature: 0.55,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  }, { httpAgent: httpsAgent });

  return completion;
}
