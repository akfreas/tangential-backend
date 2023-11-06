import OpenAI from 'openai';
import { httpsAgent } from '../config/config';

interface ChatCompletionParams {
  messages: any[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export async function createChatCompletion({
  messages,
  model,
}: ChatCompletionParams): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No OpenAI API key found');
  }
  const openai = new OpenAI({
    apiKey,
  });

  const completion = await openai.chat.completions.create({
    messages,
    model,
  }, { httpAgent: httpsAgent });

  return completion;
}
