import { makeJiraRequest } from '../../src/utils/jiraRequest';
import { analyzeEpic, analyzeProject, fetchProjectById, getFields, sumRemainingStoryPointsForEpic, sumTotalStoryPointsForEpic, sumTotalStoryPointsForProject } from '../../src/utils/jira';
import { jest } from '@jest/globals'; // Import Jest's extended types
import { makeDiskRequest } from './utils/makeDiskRequest';
import { DateTime } from 'luxon';
import { PointsField, doLog, jsonLog } from '@akfreas/tangential-core';

jest.mock('../../src/utils/jiraRequest', () => ({
  makeJiraRequest: jest.fn(),
}));

const mockedMakeJiraRequest = makeJiraRequest as jest.MockedFunction<typeof makeJiraRequest>;
const auth = {
  "accessToken": "eyJraWQiOiJmZTM2ZThkMzZjMTA2N2RjYTgyNTg5MmEiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiI0YmRiMTY3OC0xZDIxLTRiMzAtYThjOC1mMjA3OWUxYWYzNGYiLCJzdWIiOiI3MTIwMjA6OTQ0ZTIzMTQtYjBiNS00ZWRkLWE4MmEtNDU0MDYwMTEwNzJiIiwibmJmIjoxNjk5NDQxMDI1LCJpc3MiOiJodHRwczovL2F1dGguYXRsYXNzaWFuLmNvbSIsImlhdCI6MTY5OTQ0MTAyNSwiZXhwIjoxNjk5NDQ0NjI1LCJhdWQiOiJsS0NYS2xOdzJteUgxeE5tcmFwSGhwcTVLR2ticTkxaiIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS9zZXNzaW9uX2lkIjoiOWE2ZGMyZTAtNDdlNi00MzRkLTk0MDMtOWUwOTcyMTc2ZmExIiwiaHR0cHM6Ly9hdGxhc3NpYW4uY29tL3N5c3RlbUFjY291bnRFbWFpbCI6IjJiYzMyNjM5LWJkMGEtNGY2Zi04MjVlLThlMzk5MzU2ZmFiMUBjb25uZWN0LmF0bGFzc2lhbi5jb20iLCJodHRwczovL2lkLmF0bGFzc2lhbi5jb20vYXRsX3Rva2VuX3R5cGUiOiJBQ0NFU1MiLCJodHRwczovL2F0bGFzc2lhbi5jb20vZmlyc3RQYXJ0eSI6ZmFsc2UsImh0dHBzOi8vYXRsYXNzaWFuLmNvbS92ZXJpZmllZCI6dHJ1ZSwiaHR0cHM6Ly9hdGxhc3NpYW4uY29tL29hdXRoQ2xpZW50SWQiOiJsS0NYS2xOdzJteUgxeE5tcmFwSGhwcTVLR2ticTkxaiIsInZlcmlmaWVkIjoidHJ1ZSIsInNjb3BlIjoib2ZmbGluZV9hY2Nlc3MgcmVhZDpqaXJhLXVzZXIgcmVhZDpqaXJhLXdvcmsgcmVhZDptZSIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS9wcm9jZXNzUmVnaW9uIjoidXMtZWFzdC0xIiwiaHR0cHM6Ly9pZC5hdGxhc3NpYW4uY29tL3VqdCI6ImMxM2YxMjA0LWVmMWItNGE3Ny1iMjlmLTE5NmFjM2I1YzhkYyIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS9yZWZyZXNoX2NoYWluX2lkIjoibEtDWEtsTncybXlIMXhObXJhcEhocHE1S0drYnE5MWotNzEyMDIwOjk0NGUyMzE0LWIwYjUtNGVkZC1hODJhLTQ1NDA2MDExMDcyYi05NzVhNjQyYy1jOWM0LTQxMzQtOTAwYS01Y2U4NjQ0NzI3YjkiLCJodHRwczovL2F0bGFzc2lhbi5jb20vM2xvIjp0cnVlLCJodHRwczovL2F0bGFzc2lhbi5jb20vZW1haWxEb21haW4iOiJ0YW5nZW50aWFsLmFwcCIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS92ZXJpZmllZCI6dHJ1ZSwiaHR0cHM6Ly9hdGxhc3NpYW4uY29tL3N5c3RlbUFjY291bnRJZCI6IjcxMjAyMDpkNTYyNzZlZi02YmE2LTQzYWMtOGQwYy0wNmQ0N2FlZmRlZGMiLCJjbGllbnRfaWQiOiJsS0NYS2xOdzJteUgxeE5tcmFwSGhwcTVLR2ticTkxaiIsImh0dHBzOi8vYXRsYXNzaWFuLmNvbS9zeXN0ZW1BY2NvdW50RW1haWxEb21haW4iOiJjb25uZWN0LmF0bGFzc2lhbi5jb20ifQ.a6j9JhP8yTpGyn7nfjTDzaGWOFM65owHtcwDsx4AMxAdw8nwjIEK027T5_JQQ_tP2E9Gt0v-JI3qzXjzmsv9Om2-ggKnhZfip5ECuhpDqKiYxNdOCY00tBGNsyHl92mF1Wu93DTKfNdcfsXBVmaskHpk3L2Efb0fjkUnjQ0517gcht9LxqsjdmauNbmwGSp8KDATmE-Jgcc8-vDGvNHHCWt29pC5F44fa4jDSX5GEhTbAuZXoYwQwvzRJQkLbChB8_Pf-RsyYG-R_8TDjpenSaNppMeo85pAZbyRG7S7Zew07MKjRvaAGc-3tQfH_nDiUyg2PBCcc-FMhSkUMF7aWw",
  "atlassianId": "d3ad714f-4260-4f1c-9bc4-00c62e1a52e9"
};
jest.setTimeout(30000);

describe('jira requests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockedMakeJiraRequest.mockImplementation((options) => {
      const testName = expect.getState().currentTestName?.replace(/\s/g, '-');
      if (!testName) throw new Error("Test name not found");
      return makeDiskRequest(options, testName)
    });
  });

  it.skip('does project analysis', async () => {

    const report = await analyzeProject("TAN", DateTime.fromISO('2021-09-01'), auth, 30);
    jsonLog("Result", report);
  });

  it('calculates story points for an epic', async () => {
    const epicKey = 'TAN-117';
    const pointsFields: PointsField[] = await getFields(auth, 'point');  // Assuming getFields returns the fields used for story points
    const totalPoints = await sumTotalStoryPointsForEpic(epicKey, pointsFields, auth);

    expect(totalPoints).toBe(56);
  });

  it('calculates story points for a project', async () => {

    const pointsFields: PointsField[] = await getFields(auth, 'point');  // Assuming getFields returns the fields used for story points
    const totalPoints = await sumTotalStoryPointsForProject("TAN", pointsFields, auth);

    expect(totalPoints).toBe(96.5);

  });

});
