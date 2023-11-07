import { makeJiraRequest } from '../../src/utils/jiraRequest';
import { analyzeEpic, analyzeProject, fetchProjectById, getFields, sumRemainingStoryPointsForEpic } from '../../src/utils/jira';
import { jest } from '@jest/globals'; // Import Jest's extended types
import { makeDiskRequest } from './utils/makeDiskRequest';
import { DateTime } from 'luxon';
import { PointsField, jsonLog } from '@akfreas/tangential-core';

// jest.mock('../../src/utils/jiraRequest', () => ({
//   makeJiraRequest: jest.fn(),
// }));

// const mockedMakeJiraRequest = makeJiraRequest as jest.MockedFunction<typeof makeJiraRequest>;
const auth = {
  "accessToken": "eyJraWQiOiJmZTM2ZThkMzZjMTA2N2RjYTgyNTg5MmEiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiIzZmY0OTc1My1iODhkLTQ0MzUtOTg5MC03ZDk5OTQ4YWE3OTAiLCJzdWIiOiI3MTIwMjA6OTQ0ZTIzMTQtYjBiNS00ZWRkLWE4MmEtNDU0MDYwMTEwNzJiIiwibmJmIjoxNjk5MzYwNTE2LCJpc3MiOiJodHRwczovL2F1dGguYXRsYXNzaWFuLmNvbSIsImlhdCI6MTY5OTM2MDUxNiwiZXhwIjoxNjk5MzY0MTE2LCJhdWQiOiJsS0NYS2xOdzJteUgxeE5tcmFwSGhwcTVLR2ticTkxaiIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS9zZXNzaW9uX2lkIjoiOWE2ZGMyZTAtNDdlNi00MzRkLTk0MDMtOWUwOTcyMTc2ZmExIiwiaHR0cHM6Ly9hdGxhc3NpYW4uY29tL3N5c3RlbUFjY291bnRFbWFpbCI6IjJiYzMyNjM5LWJkMGEtNGY2Zi04MjVlLThlMzk5MzU2ZmFiMUBjb25uZWN0LmF0bGFzc2lhbi5jb20iLCJodHRwczovL2lkLmF0bGFzc2lhbi5jb20vYXRsX3Rva2VuX3R5cGUiOiJBQ0NFU1MiLCJodHRwczovL2F0bGFzc2lhbi5jb20vZmlyc3RQYXJ0eSI6ZmFsc2UsImh0dHBzOi8vYXRsYXNzaWFuLmNvbS92ZXJpZmllZCI6dHJ1ZSwiaHR0cHM6Ly9hdGxhc3NpYW4uY29tL29hdXRoQ2xpZW50SWQiOiJsS0NYS2xOdzJteUgxeE5tcmFwSGhwcTVLR2ticTkxaiIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS9wcm9jZXNzUmVnaW9uIjoidXMtZWFzdC0xIiwic2NvcGUiOiJyZWFkOmppcmEtd29yayBvZmZsaW5lX2FjY2VzcyByZWFkOm1lIHJlYWQ6amlyYS11c2VyIiwiaHR0cHM6Ly9hdGxhc3NpYW4uY29tLzNsbyI6dHJ1ZSwiaHR0cHM6Ly9hdGxhc3NpYW4uY29tL2VtYWlsRG9tYWluIjoidGFuZ2VudGlhbC5hcHAiLCJodHRwczovL2lkLmF0bGFzc2lhbi5jb20vdmVyaWZpZWQiOnRydWUsImh0dHBzOi8vYXRsYXNzaWFuLmNvbS9zeXN0ZW1BY2NvdW50SWQiOiI3MTIwMjA6ZDU2Mjc2ZWYtNmJhNi00M2FjLThkMGMtMDZkNDdhZWZkZWRjIiwiY2xpZW50X2lkIjoibEtDWEtsTncybXlIMXhObXJhcEhocHE1S0drYnE5MWoiLCJodHRwczovL2lkLmF0bGFzc2lhbi5jb20vdWp0IjoiMDc2NWVmODctNDc2Zi00ZTA0LTliYjgtNTYxNTdkODZlMTljIiwiaHR0cHM6Ly9hdGxhc3NpYW4uY29tL3N5c3RlbUFjY291bnRFbWFpbERvbWFpbiI6ImNvbm5lY3QuYXRsYXNzaWFuLmNvbSJ9.m-nrNiUY6MycnP1SEEpzcR9pXXzSgk-Qog3VzasAdBzS5qVmdsWqu6I1TrT4iteoeqiQ-SmzM763KHfeDVDggb3-O8f4vrGQDieZ9LgqFM44tgmHrdVOQjm1WkaNpW2v0W3n9TvLDkmgOJgi9IK-SKS25XftBmAWETuUE0P16NIV8COXzlcdf5ZZQw0D8fy8yRZEG_vC6Q-5zJBkHGDX0rfXj4xODxlpu2nEsijOn4Ka-K4DEa5FmNJXPI2Y-O4rNBLt-hwqPPVq3aRv_O9OWcZDcgbrgyXNw_bvSOzkgMvK-ucKkt7vdJCLLGlolcljUV7XoAS916KMnbX1kNbrzw",
  "atlassianId": "d3ad714f-4260-4f1c-9bc4-00c62e1a52e9"
};
jest.setTimeout(30000);

describe('jira requests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // mockedMakeJiraRequest.mockImplementation(makeDiskRequest);
  });

  it('does project analysis', async () => {

    const report = await analyzeProject("TAN", DateTime.fromISO('2021-09-01'), auth, 30);
    jsonLog("Result", report);
  });

});
