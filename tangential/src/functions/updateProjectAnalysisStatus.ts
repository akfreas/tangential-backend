import { MongoDBWrapper, ProjectReport, doLog } from "@akfreas/tangential-core";
import { SQSHandler } from "aws-lambda";
import { sendProjectAnalysisFinalizeQueueMessage } from "../utils/sqs";

export const handler: SQSHandler = async (event) => {

  try {
    for (const record of event.Records) {

      const { epicKey, jobId } = JSON.parse(record.body);

      const dbWrapper = await MongoDBWrapper.getInstance(process.env.MONGODB_URI, process.env.MONGODB_DATABASE);
      
      const dbCollection = dbWrapper.getCollection<any>('reports');
      
      doLog(`Wrote report for ${epicKey} to database`)

      const filter = { jobId, reportType: 'project' };

      const projectReport: ProjectReport = await dbCollection.findOne(filter);

      const remainingItems = projectReport.buildStatus.remainingItems.filter(item => item !== epicKey)

      projectReport.buildStatus.remainingItems = remainingItems;
      doLog(`Removed ${epicKey} from remaining items for job ${jobId}`)

      dbCollection.updateOne(
        filter, 
        { $set: projectReport }, 
        { upsert: true } 
      );

      if (remainingItems.length === 0) {
        await sendProjectAnalysisFinalizeQueueMessage(jobId);
        doLog(`Project analysis complete for job ${jobId}, sending finalize message`)
      }
    }
  } catch (error) {
    
    console.error("Error processing SQS event", error);
    throw error;
  }
}
