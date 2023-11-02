import { JiraRequestAuth, GetByJqlResponse } from '@akfreas/tangential-core';
import { makeJiraRequest } from '../../src/utils/jiraRequest';
import { getByJql } from '../../src/utils/jira';
import { jest } from '@jest/globals'; // Import Jest's extended types

// TypeScript needs to know that makeJiraRequest is a mock function here
jest.mock('../../src/utils/jiraRequest', () => ({
  makeJiraRequest: jest.fn(),
}));

// Now we can use the correct type for the mock
const mockedMakeJiraRequest = makeJiraRequest as jest.MockedFunction<typeof makeJiraRequest>;

describe('getByJql', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('fetches issues successfully and returns the correct response', async () => {
    const mockAuth: JiraRequestAuth = { accessToken: 'testtoken', atlassianId: 'testid' };
    const mockIssues = [{ id: '1', key: 'TEST-1' }, { id: '2', key: 'TEST-2' }];
    const mockResponse = { issues: mockIssues };

    // Set up the mock to return the mock response using the correctly typed mock
    mockedMakeJiraRequest.mockResolvedValue(mockResponse);

    // Call the function with the mock data
    const response = await getByJql('project=10001', mockAuth, 2);

    // Assertions to check if the function behaves as expected
    expect(response).toHaveProperty('issues');
    expect(response.issues).toHaveLength(2);
    expect(mockedMakeJiraRequest).toHaveBeenCalledTimes(1);
  });

  // ... other tests
});
