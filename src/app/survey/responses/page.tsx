import { Wrench } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { buttonClass } from "@/components/button-class";
import { Badge, Card, Container, EmptyState, PageHeader } from "@/components/ui";
import { clearSurveyResponses } from "@/app/actions";
import { readResponses } from "@/lib/store";

export const metadata = { title: "Repair reports" };

const timeFormat: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };

export default async function ResponsesPage() {
  await connection();
  const responses = await readResponses();
  const n = responses.length;

  return (
    <Container>
      <PageHeader
        title="Repair reports"
        subtitle={`${n} ${n === 1 ? "report" : "reports"}`}
        actions={
          <Link href="/survey" className={buttonClass({ variant: "primary" })}>
            New report
          </Link>
        }
      />
      <div className="space-y-6">
        <Card flush>
          {n === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No repair reports yet"
              description="Reports sent from the survey show up here."
              action={
                <Link href="/survey" className={buttonClass({ variant: "primary" })}>
                  Send a report
                </Link>
              }
            />
          ) : (
            <div className="max-md:overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-surface-2 text-xs font-medium text-ink-3">
                    <th scope="col" className="whitespace-nowrap border-b border-line px-5 py-2.5 font-medium md:sticky md:top-14 bg-surface-2">
                      Received
                    </th>
                    <th scope="col" className="border-b border-line px-5 py-2.5 font-medium md:sticky md:top-14 bg-surface-2">
                      From
                    </th>
                    <th scope="col" className="border-b border-line px-5 py-2.5 font-medium md:sticky md:top-14 bg-surface-2">
                      Report
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r) => (
                    <tr key={r.id} className="border-b border-line align-top last:border-b-0 hover:bg-surface-hover">
                      <td className="whitespace-nowrap px-5 py-3">
                        <time
                          dateTime={r.submittedAt}
                          suppressHydrationWarning
                          className="tabular text-ink"
                        >
                          {new Date(r.submittedAt).toLocaleString([], timeFormat)}
                        </time>
                        {r.eventName && (
                          <div className="mt-1.5">
                            <Badge>{r.eventName}</Badge>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {r.submittedBy ? (
                          <span className="text-ink">{r.submittedBy}</span>
                        ) : (
                          <span className="text-ink-3">Anonymous</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <dl className="space-y-1.5">
                          {r.answers
                            .filter((a) => a.value)
                            .map((a, i) => (
                              <div key={i}>
                                <dt className="text-[13px] text-ink-3">{a.label}</dt>
                                <dd className="whitespace-pre-wrap text-ink">{a.value}</dd>
                              </div>
                            ))}
                        </dl>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        {n > 0 && (
          <Card title="Start a new event" description="Clear reports left over from a previous event.">
            <ActionForm
              action={clearSurveyResponses}
              submitLabel="Delete all reports"
              pendingLabel="Deleting…"
              submitVariant="danger-soft"
              confirmMessage={`Delete all ${n} repair reports? This can't be undone.`}
            >
              <></>
            </ActionForm>
          </Card>
        )}
      </div>
    </Container>
  );
}
