import { ChangelogValue, EpicReport, jsonLog } from "@akfreas/tangential-core";
import { createChatCompletion } from "./openAiWrapper";


function formatChangelog(changelog: ChangelogValue[]) {

  if (!changelog || changelog.length === 0) {
    return "No recent changes";
  }

  // Filter out the changelog entries for important fields such as 'summary', 'status', and 'assignee'
  const importantFields = ['summary', 'status', 'assignee'];
  const importantChanges = changelog
    .map(entry => {
      const changes = entry.items
        .filter(item => importantFields.includes(item.field))
        .map(item => {
          const from = item.fromString ? `from "${item.fromString}" ` : '';
          const to = item.toString ? `to "${item.toString}"` : '';
          return `${item.field} ${from}${to}`;
        });
      return changes.length > 0 ? `On ${entry.created}, ${entry.author.displayName} made the following changes: ${changes.join(', ')}` : null;
    })
    .filter(change => change !== null); // Remove null entries where no important changes were found

  return importantChanges.join(' | ');
}

function summarizeEpic(epicReport: EpicReport) {
  // Destructure for easier access
  const {
    epicKey,
    summary,
    assignee,
    statusName,
    priority,
    completedPoints,
    totalPoints,
    remainingPoints,
    inProgressPoints,
    velocity,
    dueDate,
    changelogs,
    longRunningIssues,
    analysis
  } = epicReport;

  const { predictedEndDate, predictedOverdue } = analysis ?? {};

  // Create a list of recent changes
  const recentChanges = formatChangelog(changelogs);

  // List long running issues
  const longRunning = (longRunningIssues ?? []).map(issue => `${issue.key}`).join(', ');

  // Analysis summary text
  const analysisSummary = analysis && analysis.summaryText ? analysis.summaryText : 'No summary available';

  // Construct the summary string
  // Epic Key and Summary: ${epicKey} - ${summary}
  const summaryString = `
Assignee: ${assignee?.displayName ?? "No assignee"}
Current Status: ${statusName || 'No status'}
Priority: ${priority ? `${priority.name} (Icon: ${priority.iconUrl})` : 'No priority'}
Progress: ${completedPoints} / ${totalPoints} completed, ${remainingPoints} remaining, ${inProgressPoints} in progress
Velocity: ${velocity.daily} per day, ${velocity.total} in total over ${velocity.window} days
Deadlines: Due on ${dueDate || 'No due date'}, Predicted to end by ${predictedEndDate || 'No prediction'}, Overdue: ${predictedOverdue ? 'Yes' : 'No'}
Recent Changes: ${recentChanges || 'No recent changes'}
Long Running Issues: ${longRunning || 'None'}
Analysis Summary: ${analysisSummary}
  `;

  return summaryString.trim(); // Trim to remove any leading/trailing whitespace
}


export async function summarizeEpicReport(report: EpicReport) {
  
  const summary = summarizeEpic(report);
  const prompt = `
    You are an assistant to a technical program manager. You are tasked with writing a one sentence summary of the epic report below.
    This will be used to provide a quick overview of the epic to the program manager.
    Do not mention the epic key or summary in your summary.
    Do not mention the epic name.
    
  `;
  const result = await createChatCompletion({
    messages: [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content: summary
      }
    ],
  });

  jsonLog("Result", result)
  const {
    choices: [{message: {content}}]
  } = result;

  return content;
}