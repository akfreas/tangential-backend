import {
  MongoClient, Db, Collection,
  OptionalUnlessRequiredId, InsertOneResult,
  ServerApiVersion, Document
} from 'mongodb';
import { doLog, jsonLog } from './logging';

export default class MongoDBWrapper {
  private static instance: MongoDBWrapper;
  private client: MongoClient;
  public db: Db;

  private constructor() { }

  public static async getInstance(): Promise<MongoDBWrapper> {
    if (!this.instance) {
      this.instance = new MongoDBWrapper();
      await this.instance.connect();
    }
    return this.instance;
  }

  private async connect(): Promise<void> {
    try {
      const url = process.env.MONGODB_URL as string;
      let options = {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      }
      // console.log('Connecting to MongoDB...', url);
      // if (process.env.LOCAL_HTTP_PROXY) {
      //   options = {
      //     ...options,
      //     ...{
      //       proxyHost: process.env.LOCAL_HTTP_PROXY.split(':')[0],
      //       proxyPort: parseInt(process.env.LOCAL_HTTP_PROXY.split(':')[2])
      //     },
      //   }
      // }
      this.client = new MongoClient(url, options);
      this.db = this.client.db(); // You can specify a database name here if needed
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
    }
  }

  public getCollection<T extends Document>(name: string): Collection<T> {
    return this.db.collection<T>(name);
  }

  public async storeDocument<T extends Document>(collection: Collection<T>, document: OptionalUnlessRequiredId<T>): Promise<void> {
    const result: InsertOneResult<T> = await collection.insertOne(document);
    if (result.acknowledged !== true) {
      throw new Error(`Failed to insert document into collection ${collection.collectionName}`);
    }
  }
}