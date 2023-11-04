import { JiraRequestAuth, GetByJqlResponse, JiraRequestOptions } from '@akfreas/tangential-core';
import { makeJiraRequest } from '../../src/utils/jiraRequest';
import { analyzeEpic, analyzeProject, getByJql, getCommentsTimeline } from '../../src/utils/jira';
import { jest } from '@jest/globals'; // Import Jest's extended types
import { makeDiskRequest } from './utils/makeDiskRequest';
import { DateTime } from 'luxon';
import { jsonLog } from '../../src/utils/logging';

// TypeScript needs to know that makeJiraRequest is a mock function here
// jest.mock('../../src/utils/jiraRequest', () => ({
//   makeJiraRequest: jest.fn(),
// }));

// Now we can use the correct type for the mock
// const mockedMakeJiraRequest = makeJiraRequest as jest.MockedFunction<typeof makeJiraRequest>;


describe('jira requests', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // mockedMakeJiraRequest.mockImplementation(makeDiskRequest);
  });

  it('does project analysis', async () => {

    // Set up the mock to return the mock response using the correctly typed mock



    const result = await analyzeProject(
      "TAN",
      DateTime.fromISO("2023-10-24T00:00:00.000+02:00"),
      {
        "accessToken": "token",
        "atlassianId": "d3ad714f-4260-4f1c-9bc4-00c62e1a52e9"
      },
      30,
      7
    );

    expect(result).toHaveProperty('active');
    expect(result.projectKey).toBe("TAN");
  });

  it('analyzes epic', async () => {

    const result = await analyzeEpic(
      "TAN-117",
      DateTime.fromISO("2023-10-24T00:00:00.000+02:00"),
      {
        "accessToken": "token",
        "atlassianId": "d3ad714f-4260-4f1c-9bc4-00c62e1a52e9"
      },
    )

    jsonLog("result", result);
  })

  it('gets comments and splits them', async () => {

    const result = await getCommentsTimeline(
      "10100",
      {
        "accessToken": "eyJraWQiOiJmZTM2ZThkMzZjMTA2N2RjYTgyNTg5MmEiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiI5OTgxMDRkZi1mNzVlLTQ4ZTEtODM5MS01MTJjNTc0YWFiMWMiLCJzdWIiOiI3MTIwMjA6OTQ0ZTIzMTQtYjBiNS00ZWRkLWE4MmEtNDU0MDYwMTEwNzJiIiwibmJmIjoxNjk5MDE3ODUyLCJpc3MiOiJodHRwczovL2F1dGguYXRsYXNzaWFuLmNvbSIsImlhdCI6MTY5OTAxNzg1MiwiZXhwIjoxNjk5MDIxNDUyLCJhdWQiOiJsS0NYS2xOdzJteUgxeE5tcmFwSGhwcTVLR2ticTkxaiIsImh0dHBzOi8vYXRsYXNzaWFuLmNvbS9zeXN0ZW1BY2NvdW50RW1haWwiOiIyYmMzMjYzOS1iZDBhLTRmNmYtODI1ZS04ZTM5OTM1NmZhYjFAY29ubmVjdC5hdGxhc3NpYW4uY29tIiwiaHR0cHM6Ly9pZC5hdGxhc3NpYW4uY29tL3VqdCI6IjlhMDc4MjFjLTBkNjktNGE5ZS1hZmUzLTg0OTFlNjQ2N2Y3OSIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS9hdGxfdG9rZW5fdHlwZSI6IkFDQ0VTUyIsImh0dHBzOi8vYXRsYXNzaWFuLmNvbS9maXJzdFBhcnR5IjpmYWxzZSwiaHR0cHM6Ly9hdGxhc3NpYW4uY29tL3ZlcmlmaWVkIjp0cnVlLCJodHRwczovL2F0bGFzc2lhbi5jb20vb2F1dGhDbGllbnRJZCI6ImxLQ1hLbE53Mm15SDF4Tm1yYXBIaHBxNUtHa2JxOTFqIiwidmVyaWZpZWQiOiJ0cnVlIiwic2NvcGUiOiJvZmZsaW5lX2FjY2VzcyByZWFkOmppcmEtdXNlciByZWFkOmppcmEtd29yayByZWFkOm1lIiwiaHR0cHM6Ly9pZC5hdGxhc3NpYW4uY29tL3Byb2Nlc3NSZWdpb24iOiJ1cy1lYXN0LTEiLCJodHRwczovL2F0bGFzc2lhbi5jb20vM2xvIjp0cnVlLCJodHRwczovL2F0bGFzc2lhbi5jb20vZW1haWxEb21haW4iOiJ0YW5nZW50aWFsLmFwcCIsImh0dHBzOi8vaWQuYXRsYXNzaWFuLmNvbS92ZXJpZmllZCI6dHJ1ZSwiaHR0cHM6Ly9pZC5hdGxhc3NpYW4uY29tL3Nlc3Npb25faWQiOiIwOTk0ZDQ5ZS03MjU1LTQ2ZGMtYTQxOS05OTY3NjMyYjUzZWYiLCJodHRwczovL2lkLmF0bGFzc2lhbi5jb20vcmVmcmVzaF9jaGFpbl9pZCI6ImxLQ1hLbE53Mm15SDF4Tm1yYXBIaHBxNUtHa2JxOTFqLTcxMjAyMDo5NDRlMjMxNC1iMGI1LTRlZGQtYTgyYS00NTQwNjAxMTA3MmItMWYxNDIwOTgtNjViZC00MWJkLWJmNmUtNTRiOThhMmRlNzE3IiwiaHR0cHM6Ly9hdGxhc3NpYW4uY29tL3N5c3RlbUFjY291bnRJZCI6IjcxMjAyMDpkNTYyNzZlZi02YmE2LTQzYWMtOGQwYy0wNmQ0N2FlZmRlZGMiLCJjbGllbnRfaWQiOiJsS0NYS2xOdzJteUgxeE5tcmFwSGhwcTVLR2ticTkxaiIsImh0dHBzOi8vYXRsYXNzaWFuLmNvbS9zeXN0ZW1BY2NvdW50RW1haWxEb21haW4iOiJjb25uZWN0LmF0bGFzc2lhbi5jb20ifQ.iIn2ih-qtfyLMXzecJuRAK06S3tS8BiLFZVuqsvG_bapQbRo1_JpIWnw7JwI93H27ftXd_Ww-7ZZN2Pqpc_vz2JOezDJZL1z6B9dpv1-3szd-a-K0ti7NUN9XQiL2inChfSyM8DGf_-u0f0sooaVPSnZ1wS5JRR_olL22fyOlCFtCK-Hv-R3wjTaWS1DVIv6CM5ejz5DT3zBT581OyctSUtmqGGpre2YChN5LRG8k3-s5rf6M0oXs6OhtL8PDPb3eWJkQ2LpiiurThuzLxVYdBzOY3eOmtdMSLi3WrFaEdAsqrQ52TAH0e1fsgjWaJgeUqpaPF2tR-TAsfHxlA-Qcg",
        "atlassianId": "d3ad714f-4260-4f1c-9bc4-00c62e1a52e9"
      },
      "2023-10-24T00:00:00.000+02:00",
    )
    // result.map((r) => {

    jsonLog("result", result);
  })
});
