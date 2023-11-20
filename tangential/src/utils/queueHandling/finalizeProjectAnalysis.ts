import { MongoDBWrapper, ProjectReport, doLog } from "@akfreas/tangential-core";
import { SQSRecord } from "aws-lambda";

export async function handleProjectAnalysisFinalizeMessage(record: SQSRecord) {
    const { buildId } = JSON.parse(record.body);
    const dbWrapper = await MongoDBWrapper.getInstance(process.env.MONGODB_URI, process.env.MONGODB_DATABASE);

    const dbCollection = dbWrapper.getCollection<any>('reports');

    const filter = { buildId, reportType: 'project' }
    const report: ProjectReport = await dbCollection.findOne(filter);

    report.buildStatus.status = 'success';

    dbCollection.updateOne(
      filter,
      { $set: report },
      { upsert: true }
    );
    doLog(`Project analysis complete for job ${buildId}`)
}