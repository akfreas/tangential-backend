import 'jest';
import { summarizeEpicReport } from "../../src/utils/summarizationUtils";
import fs from 'fs';

jest.mock("../../src/utils/summarizationUtils")

describe("summarizeEpicReport", () => {

  beforeEach(() => {
    jest.clearAllMocks();

    summarizeEpicReport()
  });

  test("should summarize an epic report", async () => {
    const epicReport = fs.readFileSync('epicReport.json', 'utf-8');


  });
});
