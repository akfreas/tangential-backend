import {
  MongoDBWrapper,
  ProjectReport,
  doLog,
  jsonLog,
} from "@akfreas/tangential-core";
import { SQSHandler } from "aws-lambda";
import { sendProjectAnalysisFinalizeQueueMessage } from "../utils/sqs";

export const handler: SQSHandler = async (event) => {
  try {
    for (const record of event.Records) {
      const { epicKey, parentProjectId, auth } = JSON.parse(record.body);

      const dbWrapper = await MongoDBWrapper.getInstance(
        process.env.MONGODB_URI,
        process.env.MONGODB_DATABASE
      );

      const dbCollection = dbWrapper.getCollection<any>("reports");

      doLog(`Wrote report for ${epicKey} to database`);

      const filter = { id: parentProjectId, reportType: "project" };

      const projectReport: ProjectReport = await dbCollection.findOne(filter);
      if (!projectReport) {
        throw new Error(
          `No project report found for parent project ID ${parentProjectId}`
        );
      }
      jsonLog("Found project report", projectReport);
      const remainingItems = projectReport.buildStatus.remainingItems.filter(
        (item) => item !== epicKey
      );
      const { buildId } = projectReport;
      projectReport.buildStatus.remainingItems = remainingItems;
      doLog(`Removed ${epicKey} from remaining items for job ${buildId}`);

      dbCollection.updateOne(filter, { $set: projectReport }, { upsert: true });

      if (remainingItems.length === 0) {
        await sendProjectAnalysisFinalizeQueueMessage(parentProjectId, auth);
        doLog(
          `Project analysis complete for job ${buildId}, sending finalize message`
        );
      }
    }
  } catch (error) {
    console.error("Error processing SQS event", error);
    throw error;
  }
};
