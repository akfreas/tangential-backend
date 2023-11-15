import { MongoDBWrapper, doLog } from "@akfreas/tangential-core";
import { SQSHandler } from "aws-lambda";

export const handler: SQSHandler = async (event) => {

  try {
    for (const record of event.Records) {
      const { jobId } = JSON.parse(record.body);
      const dbWrapper = await MongoDBWrapper.getInstance(process.env.MONGODB_URI, process.env.MONGODB_DATABASE);

      const dbCollection = dbWrapper.getCollection<any>('reports');

      const filter = { jobId, reportType: 'project' }
      const report = dbCollection.findOne(filter);

      report.buildStatus.status = 'complete';

      dbCollection.updateOne(
        filter,
        { $set: report },
        { upsert: true }
      );
      doLog(`Project analysis complete for job ${jobId}`)
    }
  } catch (err) {
    console.error(err);
    throw new Error('Message processing failed');
  }

}