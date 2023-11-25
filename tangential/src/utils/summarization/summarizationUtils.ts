import {
  ChangelogValue,
  EpicReport,
  ScopeDelta,
  SummaryText,
  jsonLog,
} from "@akfreas/tangential-core";
import { createChatCompletion } from "../openAiWrapper";

function formatChangelog(changelog: ChangelogValue[]) {
  if (!changelog || changelog.length === 0) {
    return "No recent changes";
  }

  // Filter out the changelog entries for important fields such as 'summary', 'status', and 'assignee'
  const importantFields = ["summary", "status", "assignee"];
  const importantChanges = changelog
    .map((entry) => {
      const changes = entry.items
        .filter((item) => importantFields.includes(item.field))
        .map((item) => {
          const from = item.fromString ? `from "${item.fromString}" ` : "";
          const to = item.toString ? `to "${item.toString}"` : "";
          return `${item.field} ${from}${to}`;
        });
      return changes.length > 0
        ? `On ${entry.created}, ${
            entry.author.displayName
          } made the following changes: ${changes.join(", ")}`
        : null;
    })
    .filter((change) => change !== null); // Remove null entries where no important changes were found

  return importantChanges.join(" | ");
}

function scopeDeltaString(scopeDeltas: ScopeDelta[]) {
  if (!scopeDeltas || scopeDeltas.length === 0) {
    return "No scope changes";
  }

  const scopeChanges = scopeDeltas.map((delta) => {
    const change =
      delta.storyPoints > 0
        ? `added ${delta.storyPoints} story points`
        : `removed ${Math.abs(delta.storyPoints)} story points`;
    return `${delta.issueKey} ${change} by ${delta.changingUser.displayName}`;
  });

  return scopeChanges.join(", ");
}

function summarizeEpic(epicReport: EpicReport) {
  // Destructure for easier access
  const {
    assignee,
    statusName,
    priority,
    completedPoints,
    totalPoints,
    remainingPoints,
    inProgressPoints,
    velocity,
    dueDate,
    changelogTimeline,
    longRunningIssues,
    analysis,
  } = epicReport;

  const { predictedEndDate, predictedOverdue } = analysis ?? {};

  // Create a list of recent changes
  const recentChanges = formatChangelog(changelogTimeline?.afterDate ?? []);

  // List long running issues
  const longRunning = (longRunningIssues ?? [])
    .map((issue) => `${issue.key}`)
    .join(", ");

  // Analysis summary text
  const analysisSummary =
    analysis && analysis.summaryText
      ? analysis.summaryText
      : "No summary available";

  // Construct the summary string
  // Epic Key and Summary: ${epicKey} - ${summary}
  const summaryString = `
Assignee: ${assignee?.displayName ?? "No assignee"}
Current Status: ${statusName || "No status"}
Priority: ${priority ? `${priority.name}` : "No priority"}
Progress: ${completedPoints} / ${totalPoints} completed, ${remainingPoints} remaining, ${inProgressPoints} in progress
Velocity: ${velocity.daily} per day, ${velocity.total} in total over ${
    velocity.window
  } days
Deadlines: Due on ${dueDate || "No due date"}, Predicted to end by ${
    predictedEndDate || "No prediction"
  }, Overdue: ${predictedOverdue ? "Yes" : "No"}
Recent Changes: ${recentChanges || "No recent changes"}
Scope Changes: ${scopeDeltaString(epicReport.scopeDeltas)}
Long Running Issues: ${longRunning || "None"}
Analysis Summary: ${analysisSummary}
  `;

  return summaryString.trim(); // Trim to remove any leading/trailing whitespace
}

export async function summarizeEpicReport(
  report: EpicReport,
): Promise<SummaryText> {
  if (process.env.DISABLE_SUMMARIZATION === "true") {
    return {
      shortSummary: "Summarization is disabled.",
      longSummary: "Summarization is disabled.",
      potentialRisks: "Summarization is disabled.",
      actionNeeded: false,
      color: "green",
    };
  }
  const summary = summarizeEpic(report);
  const prompt = `
    You are an assistant to a technical program manager. You are tasked with writing a summary of the epic report below.
    This will be used to provide a quick overview of the epic to the program manager.
    Identify any risks that the program manager should be aware of, especially if the epic is at risk of not being completed on time.
    Scope changes are important to note, especially if they are large. Long running issues are also important to note, as they may be blocking the epic.
    Do not mention the epic key or summary in your summary.
    Do not mention the epic name.

    Give two responses, one that is only a few short sentences long, and another that is between three and four sentences long and goes into more detail about potential risks and recent changes
    Respond in JSON format, using the following structures as examples. 
    Only use "green", "yellow", or "red" for the color field. They correspond to "on track", "at risk", and "off track" respectively.
    The actionNeeded field should be true if there are any significant potential risks.
    {
      shortSummary: "Projected to complete on time. One long running issue (TAN-123) may block the epic. Velocity is 5 points per day.",
      longSummary: "Projected to complete on time. One long running issue (TAN-123) may block the epic. Velocity is 5 points per day. Recent changes include a change in assignee and a change in status.",
      potentialRisks: "A change in assignee may cause delays. Because there's a long running issue, that may also have potential impacts because it may mean that someone is blocked.",
      actionNeeded: false,
      color: "green"
    }
    {
      shortSummary: "On track to finish on time, but there is one long running issue (TAN-123) that may block the epic. Velocity is 5 points per day.",
      longSummary: "On track to finish on time, but there is one long running issue (TAN-123) that may block the epic. Velocity is 5 points per day. Recent changes include a change in assignee and a change in status. The change in assignee may cause delays. Because there's a long running issue, that may also have potential impacts because it may mean that someone is blocked.",
      potentialRisks: "A change in assignee may cause delays. Because there's a long running issue, that may also have potential impacts because it may mean that someone is blocked.",
      actionNeeded: true,
      color: "yellow"
    }
    {
      "shortSummary": "Significantly behind schedule. Multiple long running issues (TAN-234, TAN-345) severely blocking the epic. Velocity is only 2 points per day.",
      "longSummary": "The epic is significantly behind schedule due to multiple long running issues (TAN-234, TAN-345), which are severely blocking progress. Current team velocity has dropped to only 2 points per day. Recent changes include multiple shifts in assignee roles and several status updates indicating stalled progress.",
      "potentialRisks": "Frequent changes in assignees leading to loss of context and delays. The long running issues indicate deep-rooted problems that are hindering progress. Additionally, the low velocity suggests team burnout or resource allocation issues, further impeding the epic's completion.",
      "actionNeeded": true,
      "color": "red"
    }    
  `;
  const result = await createChatCompletion({
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: summary,
      },
    ],
  });

  jsonLog("Summarization result", result);
  return result;
}
