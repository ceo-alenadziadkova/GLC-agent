import type { BriefResponseDisplayLabels, BriefResponses } from '../data/briefQuestions';
import { formatBriefResponseCellForDisplay } from '../data/briefQuestions';
import { getQuestionLabel } from '../lib/intake-question-lookup';

export type BriefPipelineAnsweredTableProps = {
  answeredIds: string[];
  responses: BriefResponses;
  questionHeader: string;
  answerHeader: string;
  valueLabels: BriefResponseDisplayLabels;
};

export function BriefPipelineAnsweredTable({
  answeredIds,
  responses,
  questionHeader,
  answerHeader,
  valueLabels,
}: BriefPipelineAnsweredTableProps) {
  if (answeredIds.length === 0) return null;

  return (
    <div className="mt-[length:var(--space-2)] w-full overflow-x-auto">
      <table className="ds-brief-answered-table">
        <thead>
          <tr>
            <th scope="col">{questionHeader}</th>
            <th scope="col">{answerHeader}</th>
          </tr>
        </thead>
        <tbody>
          {answeredIds.map(id => (
            <tr key={id}>
              <th scope="row">{getQuestionLabel(id)}</th>
              <td>{formatBriefResponseCellForDisplay(responses[id], valueLabels)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
