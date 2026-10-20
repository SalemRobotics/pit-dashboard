import Link from "next/link";
import { connection } from "next/server";
import { ActionForm } from "@/components/action-form";
import { buttonClass } from "@/components/button-class";
import { Card, Container, Field, PageHeader, inputClass } from "@/components/ui";
import { readSettings } from "@/lib/store";
import { LAYOUT_LIMITS } from "@/lib/types";
import { saveDisplaySettings, saveLayoutSettings, saveSurveyQuestions } from "../actions";
import { QuestionEditor } from "./question-editor";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const settings = await readSettings();
  const { streamWidth: w, streamHeight: h } = LAYOUT_LIMITS;

  return (
    <Container>
      <PageHeader title="Settings" subtitle="Set up the displays and pit repair survey for this event." />
      <div className="flex flex-col gap-6">
        <Card title="Event and displays" description="What the pit display shows and where it gets its video and queue info.">
          <ActionForm action={saveDisplaySettings} submitLabel="Save display settings" pendingLabel="Saving…">
            <div className="grid gap-4">
              <Field label="Event name" htmlFor="eventName">
                <input
                  id="eventName"
                  name="eventName"
                  type="text"
                  className={inputClass}
                  defaultValue={settings.eventName}
                  placeholder="2027 Example Regional"
                />
              </Field>
              <Field
                label="Live stream URL"
                htmlFor="streamUrl"
                hint="YouTube and Twitch links work as-is. For anything else, paste the embed URL."
              >
                <input
                  id="streamUrl"
                  name="streamUrl"
                  type="url"
                  className={inputClass}
                  defaultValue={settings.streamUrl}
                  placeholder="https://www.youtube.com/watch?v=…"
                />
              </Field>
              <Field
                label="Nexus URL"
                htmlFor="nexusUrl"
                hint={'If the panel stays blank, the site may block embedding. Use "Open in new tab" on the display instead.'}
              >
                <input
                  id="nexusUrl"
                  name="nexusUrl"
                  type="url"
                  className={inputClass}
                  defaultValue={settings.nexusUrl}
                  placeholder="https://frc.nexus/…"
                />
              </Field>
            </div>
          </ActionForm>
        </Card>

        <Card
          title="Layout"
          description="Set how much of the display the stream takes up. You can also drag the dividers on the display itself."
        >
          <ActionForm action={saveLayoutSettings} submitLabel="Save layout" pendingLabel="Saving…">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Stream width (% of screen)"
                htmlFor="streamWidth"
                hint={`Between ${w.min}% and ${w.max}%.`}
              >
                <input
                  id="streamWidth"
                  name="streamWidth"
                  type="number"
                  inputMode="numeric"
                  min={w.min}
                  max={w.max}
                  step={1}
                  required
                  className={`${inputClass} tabular-nums`}
                  defaultValue={settings.layout.streamWidth}
                />
              </Field>
              <Field
                label="Stream height (% of screen)"
                htmlFor="streamHeight"
                hint={`Between ${h.min}% and ${h.max}%.`}
              >
                <input
                  id="streamHeight"
                  name="streamHeight"
                  type="number"
                  inputMode="numeric"
                  min={h.min}
                  max={h.max}
                  step={1}
                  required
                  className={`${inputClass} tabular-nums`}
                  defaultValue={settings.layout.streamHeight}
                />
              </Field>
            </div>
          </ActionForm>
        </Card>

        <Card
          title="Pit repair survey"
          description="Questions shown on the repair survey. Change them for each event."
          actions={
            <Link href="/survey" className={buttonClass({ variant: "ghost", size: "sm" })}>
              Preview survey
            </Link>
          }
        >
          <ActionForm action={saveSurveyQuestions} submitLabel="Save survey questions" pendingLabel="Saving…">
            <QuestionEditor initial={settings.questions} />
          </ActionForm>
        </Card>
      </div>
    </Container>
  );
}
