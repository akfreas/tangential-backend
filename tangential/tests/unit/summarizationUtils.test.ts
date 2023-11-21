import 'jest';
import { summarizeEpicReport } from "../../src/utils/summarization/summarizationUtils";
import fs from 'fs';
import { EpicReport, jsonLog } from '@akfreas/tangential-core';
import { createChatCompletion } from '../../src/utils/openAiWrapper';

jest.mock("../../src/utils/openAiWrapper")

describe("summarizeEpicReport", () => {
  const mockedCreateChatCompletion = createChatCompletion as jest.MockedFunction<typeof createChatCompletion>;
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateChatCompletion.mockResolvedValue({
      "id": "chatcmpl-8JiDYs8wa9sDuv2jW4qXOX5573d6Q",
      "object": "chat.completion",
      "created": 1699708896,
      "model": "gpt-4-1106-preview",
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "content": "i am a human"
          },
          "finish_reason": "stop"
        }
      ],
      "usage": {
        "prompt_tokens": 369,
        "completion_tokens": 47,
        "total_tokens": 416
      },
      "system_fingerprint": "fp_a24b4d720c"
    }
  );
  });
  

  test("should summarize an epic report", async () => {
    const epicReportString = fs.readFileSync('tests/unit/data/epicReport.json', 'utf-8');
    const epicReport = JSON.parse(epicReportString) as EpicReport;

    const summary = await summarizeEpicReport(epicReport);

    expect(summary).toEqual("i am a human");

  });
});
