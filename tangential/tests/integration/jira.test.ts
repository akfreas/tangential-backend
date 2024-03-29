import { makeJiraRequest } from "../../src/utils/jiraRequest";
import {
  getFields,
  sumTotalStoryPointsForEpic,
  sumTotalStoryPointsForProject,
} from "../../src/utils/jira";
import { jest } from "@jest/globals"; // Import Jest's extended types
import { makeDiskRequest } from "./utils/makeDiskRequest";

import { PointsField } from "@akfreas/tangential-core";

jest.mock("../../src/utils/jiraRequest", () => ({
  makeJiraRequest: jest.fn(),
}));

const mockedMakeJiraRequest = makeJiraRequest as jest.MockedFunction<
  typeof makeJiraRequest
>;
const auth = {
  accessToken: "",
  atlassianWorkspaceId: "d3ad714f-4260-4f1c-9bc4-00c62e1a52e9",
  refreshToken: "",
};
jest.setTimeout(30000);

describe("jira requests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedMakeJiraRequest.mockImplementation((options) => {
      // eslint-disable-next-line jest/no-standalone-expect
      const testName = expect.getState().currentTestName?.replace(/\s/g, "-");
      if (!testName) throw new Error("Test name not found");
      return makeDiskRequest(options, testName);
    });
  });

  it("calculates story points for an epic", async () => {
    const epicKey = "TAN-117";
    const pointsFields: PointsField[] = await getFields(auth, "point"); // Assuming getFields returns the fields used for story points
    const totalPoints = await sumTotalStoryPointsForEpic(
      epicKey,
      pointsFields,
      auth
    );

    expect(totalPoints).toBe(56);
  });

  it("calculates story points for a project", async () => {
    const pointsFields: PointsField[] = await getFields(auth, "point"); // Assuming getFields returns the fields used for story points
    const totalPoints = await sumTotalStoryPointsForProject(
      {
        id: "10000",
        name: "Tangential",
        jqlQuery: "project = TAN",
        owner: "akfreas",
      },
      pointsFields,
      auth
    );

    expect(totalPoints).toBe(96.5);
  });
});
