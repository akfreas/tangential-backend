import { SQSHandler } from "aws-lambda";
import { doLog, extractFromJiraAuth } from "@akfreas/tangential-core";
import { handleProjectAnalysisMessage } from "../utils/queueHandling/projectAnalysisMessageHandling";
import { handleEpicAnalysisMessage } from "../utils/queueHandling/epicAnalysisMessageHandling";
import { MessageType } from "../utils/sqs";
import { handleProjectAnalysisFinalizeMessage } from "../utils/queueHandling/finalizeProjectAnalysis";
export const handler: SQSHandler = async (event) => {
  try {
    for (const record of event.Records) {
      const { auth, messageType } = JSON.parse(record.body);

      if (!messageType) {
        throw new Error("No message type found");
      }

      const { atlassianUserId } = extractFromJiraAuth(auth);

      if (!atlassianUserId) {
        throw new Error("No atlassian user ID found in auth");
      } else {
        doLog("Found atlassian user ID", { atlassianUserId });
      }

      switch (messageType) {
        case MessageType.PROJECT_ANALYSIS_BEGIN: {
          await handleProjectAnalysisMessage(record);
          break;
        }
        case MessageType.EPIC_ANALYSIS: {
          await handleEpicAnalysisMessage(record);
          break;
        }
        case MessageType.PROJECT_ANALYSIS_FINALIZE: {
          await handleProjectAnalysisFinalizeMessage(record);
          break;
        }
      }
    }
  } catch (err) {
    console.error(err);
    throw new Error("Message processing failed");
  }
};
