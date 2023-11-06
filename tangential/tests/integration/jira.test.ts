import { makeJiraRequest } from '../../src/utils/jiraRequest';
import { analyzeProject } from '../../src/utils/jira';
import { jest } from '@jest/globals'; // Import Jest's extended types
import { makeDiskRequest } from './utils/makeDiskRequest';
import { DateTime } from 'luxon';

jest.mock('../../src/utils/jiraRequest', () => ({
  makeJiraRequest: jest.fn(),
}));

const mockedMakeJiraRequest = makeJiraRequest as jest.MockedFunction<typeof makeJiraRequest>;


describe('jira requests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockedMakeJiraRequest.mockImplementation(makeDiskRequest);
  });

  it('does project analysis', async () => {

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

});
