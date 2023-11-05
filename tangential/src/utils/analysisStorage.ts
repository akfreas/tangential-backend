
import { ProjectReport, MongoDBWrapper } from "@akfreas/tangential-core"

export async function storeProjectReport(report: ProjectReport): Promise<void> {
  try {
    // Validation for essential keys
    if (!report.projectKey) {
      doLog('Error: projectKey is missing in the provided report');
      return;
    }

    const dbWrapper = await MongoDBWrapper.getInstance(process.env.MONGODB_URI, process.env.MONGODB_DATABASE)

    const reportsCollection = dbWrapper.getCollection<ProjectReport>('reports');
    // Storing the report in the database
    await reportsCollection.updateOne(
      { projectKey: report.projectKey }, // filter
      { $set: report }, // update
      { upsert: true } // options: create a new document if no documents match the filter
    );

    console.log(`Successfully stored the report for project: ${report.projectKey}`);
  } catch (error) {
    doLog(`Failed to store the report: ${error}`);
  }
};

export async function fetchAllProjectReports(): Promise<ProjectReport[] | null> {
  try {
    const dbWrapper = await MongoDBWrapper.getInstance();
    const reportsCollection = dbWrapper.getCollection<ProjectReport>('reports');

    // Fetching all reports from the database
    const reports = await reportsCollection.find().toArray();

    console.log('Successfully fetched all project reports.');
    return reports;
  } catch (error) {
    doLog(`Failed to fetch reports: ${error}`);
    return null;
  }
};
