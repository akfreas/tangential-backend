import { MongoDBWrapper } from "@akfreas/tangential-core";
import { SQSHandler } from "aws-lambda";

export const handler: SQSHandler = async (event) => {
  try {
    for (const record of event.Records) {
      const { collection, upsertBody } = JSON.parse(record.body);

      const dbWrapper = await MongoDBWrapper.getInstance(
        process.env.MONGODB_URI,
        process.env.MONGODB_DATABASE,
      );

      const dbCollection = dbWrapper.getCollection<any>(collection);

      const filter = { id: upsertBody.id };

      await dbCollection.updateOne(
        filter,
        { $set: upsertBody },
        { upsert: true },
      );
    }
  } catch (error) {
    console.error("Error processing SQS event", error);
    throw error;
  }
};
