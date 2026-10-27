import { connection } from "next/server";
import { ActionForm } from "@/components/action-form";
import { SurveyDialog } from "@/components/survey-dialog";
import { Badge, Card, Container, Field, PageHeader, inputClass } from "@/components/ui";
import { getQueueState } from "@/lib/queue-monitor";
import { getRobotLogState } from "@/lib/robot-logs";
import { getStreamStatus } from "@/lib/stream-detect";
import { readSettings } from "@/lib/store";
import { LAYOUT_LIMITS } from "@/lib/types";
import {
  saveClockSettings,
  saveDisplaySettings,
  saveLayoutSettings,
  saveQueueSettings,
  saveRobotSettings,
  saveSurveyQuestions,
  testQueueAlert,
} from "../actions";
import { ClockAlarmFields } from "./clock-alarm-fields";
import { QueueAlertFields } from "./queue-alert-fields";
import { QuestionEditor } from "./question-editor";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const settings = await readSettings();
  const hasTbaKey = Boolean(settings.tbaApiKey);
  const stream = await getStreamStatus();
  const checkClass =
    "size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const queue = getQueueState();
  const robotLog = getRobotLogState();
  const hasRobotPassword = Boolean(settings.robotSshPassword);
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
                label="Event key"
                htmlFor="eventKey"
                hint="Leave blank to use the event team 6324 is registered for on The Blue Alliance. Type a key like 2027casj to override."
              >
                <input
                  id="eventKey"
                  name="eventKey"
                  type="text"
                  className={inputClass}
                  defaultValue={settings.eventKey}
                  placeholder="Detected automatically"
                  autoComplete="off"
                />
              </Field>
              <div>
                <Field
                  label="The Blue Alliance API key"
                  htmlFor="tbaApiKey"
                  hint="Free from thebluealliance.com/account (Read API key). Leave blank to keep the saved key."
                >
                  <input
                    id="tbaApiKey"
                    name="tbaApiKey"
                    type="password"
                    autoComplete="off"
                    className={inputClass}
                    placeholder={hasTbaKey ? "Saved" : "Paste your key"}
                  />
                </Field>
                {hasTbaKey && (
                  <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" name="clearTbaApiKey" className={checkClass} />
                    Remove the saved key
                  </label>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="autoStream" defaultChecked={settings.autoStream} className={checkClass} />
                  Detect the live stream automatically
                </label>
                <p className="mt-1.5 text-[13px] text-ink-3">
                  Uses today&apos;s webcast from The Blue Alliance, so it switches each competition day. The stream link
                  below is the fallback.
                </p>
              </div>
              <Field
                label="Stream link (fallback)"
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

          <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-[13px] text-ink-2" aria-label="Stream status">
            <div className="flex flex-wrap items-center gap-2">
              {stream.source === "auto" ? (
                <>
                  <Badge tone="success">Auto-detected</Badge>
                  <span>{stream.label}</span>
                </>
              ) : stream.source === "manual" ? (
                <Badge tone="neutral">Using your link</Badge>
              ) : (
                <Badge tone="neutral">No stream</Badge>
              )}
              {stream.error && (
                <>
                  <Badge tone="danger">Problem</Badge>
                  <span>{stream.error}</span>
                </>
              )}
            </div>
            <p className={stream.eventKey ? "" : "text-ink-3"}>
              {stream.eventKey
                ? `Event: ${stream.eventName ?? stream.eventKey}${stream.eventName ? ` (${stream.eventKey})` : ""} (${stream.eventAuto ? "detected" : "set in settings"})`
                : "No event found yet"}
            </p>
          </div>
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

        <Card title="Clock and alarm" description="How the clock in the header looks and how loud the timer alarm is.">
          <ActionForm action={saveClockSettings} submitLabel="Save clock and alarm" pendingLabel="Saving…">
            <ClockAlarmFields initialFormat={settings.clockFormat} initialVolume={settings.alarmVolume} />
          </ActionForm>
        </Card>

        <Card
          title="Queue alerts"
          description="Play a chime and announce the alliance when Nexus starts queuing the robot. Uses the Blue Alliance API key and event key from Event and displays."
        >
          <ActionForm action={saveQueueSettings} submitLabel="Save queue alerts" pendingLabel="Saving…">
            <QueueAlertFields
              initialEnabled={settings.queueAlertEnabled}
              initialVolume={settings.chimeVolume}
              initialDuck={settings.duckLevel}
            />
          </ActionForm>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-[13px] text-ink-2">
            {!queue.configured ? (
              <Badge tone="neutral">Not set up</Badge>
            ) : queue.error ? (
              <>
                <Badge tone="danger">Problem</Badge>
                <span>{queue.error}</span>
              </>
            ) : (
              <>
                <Badge tone="success">Connected</Badge>
                <span className="tabular-nums">
                  {queue.lastChecked
                    ? `Last checked ${new Date(queue.lastChecked).toLocaleTimeString()}`
                    : "Waiting for the first check"}
                </span>
              </>
            )}
            {queue.match && (
              <Badge tone="accent">
                Queuing: {queue.match.alliance === "red" ? "Red" : "Blue"} alliance
              </Badge>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-start gap-3">
            <ActionForm
              action={testQueueAlert}
              submitLabel="Test red alliance alert"
              submitVariant="secondary"
              pendingLabel="Playing…"
            >
              <input type="hidden" name="alliance" value="red" />
            </ActionForm>
            <ActionForm
              action={testQueueAlert}
              submitLabel="Test blue alliance alert"
              submitVariant="secondary"
              pendingLabel="Playing…"
            >
              <input type="hidden" name="alliance" value="blue" />
            </ActionForm>
          </div>
          <p className="mt-3 text-[13px] text-ink-3">
            Test sounds play from this device&apos;s speakers, not from the browser.
          </p>
        </Card>

        <Card
          title="Robot connection"
          description="Where to find the robot over SSH so logs can be pulled automatically once it's connected."
        >
          <ActionForm action={saveRobotSettings} submitLabel="Save robot connection" pendingLabel="Saving…">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Robot IP address" htmlFor="robotHost">
                <input
                  id="robotHost"
                  name="robotHost"
                  type="text"
                  required
                  className={inputClass}
                  defaultValue={settings.robotHost}
                  placeholder="10.63.24.2"
                  autoComplete="off"
                />
              </Field>
              <Field label="SSH port" htmlFor="robotSshPort">
                <input
                  id="robotSshPort"
                  name="robotSshPort"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={65535}
                  required
                  className={`${inputClass} tabular-nums`}
                  defaultValue={settings.robotSshPort}
                />
              </Field>
              <Field label="SSH username" htmlFor="robotSshUsername">
                <input
                  id="robotSshUsername"
                  name="robotSshUsername"
                  type="text"
                  className={inputClass}
                  defaultValue={settings.robotSshUsername}
                  placeholder="lvuser"
                  autoComplete="off"
                />
              </Field>
              <div>
                <Field
                  label="SSH password"
                  htmlFor="robotSshPassword"
                  hint="Leave blank to keep the saved password."
                >
                  <input
                    id="robotSshPassword"
                    name="robotSshPassword"
                    type="password"
                    autoComplete="off"
                    className={inputClass}
                    placeholder={hasRobotPassword ? "Saved" : "Enter the password"}
                  />
                </Field>
                {hasRobotPassword && (
                  <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" name="clearRobotSshPassword" className={checkClass} />
                    Remove the saved password
                  </label>
                )}
              </div>
              <Field
                label="wpilog directory"
                htmlFor="robotWpilogDir"
                hint="Remote path to pull .wpilog files from. Leave blank to skip."
              >
                <input
                  id="robotWpilogDir"
                  name="robotWpilogDir"
                  type="text"
                  className={inputClass}
                  defaultValue={settings.robotWpilogDir}
                  placeholder="/home/lvuser/logs"
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Hoot log directory"
                htmlFor="robotHootLogDir"
                hint="Remote path to pull .hoot files from. Leave blank to skip."
              >
                <input
                  id="robotHootLogDir"
                  name="robotHootLogDir"
                  type="text"
                  className={inputClass}
                  defaultValue={settings.robotHootLogDir}
                  placeholder="/home/lvuser/logs"
                  autoComplete="off"
                />
              </Field>
            </div>
          </ActionForm>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-[13px] text-ink-2">
            {robotLog.status === "idle" ? (
              <Badge tone="neutral">Not set up</Badge>
            ) : robotLog.status === "searching" ? (
              <Badge tone="neutral">Looking for the robot…</Badge>
            ) : robotLog.status === "error" ? (
              <>
                <Badge tone="danger">Problem</Badge>
                <span>{robotLog.error}</span>
              </>
            ) : (
              <>
                <Badge tone="success">{robotLog.status === "pulling" ? "Pulling logs" : "Connected"}</Badge>
                <span className="tabular-nums">
                  {robotLog.lastSeen ? `Last seen ${new Date(robotLog.lastSeen).toLocaleTimeString()}` : ""}
                </span>
              </>
            )}
            {robotLog.lastPulled && (
              <Badge tone="accent">Latest log: {robotLog.lastPulled.matchLabel ?? robotLog.lastPulled.fileName}</Badge>
            )}
          </div>
        </Card>

        <Card
          title="Pit repair survey"
          description="Questions shown on the repair survey. Change them for each event. Every report also asks for the reporter's name as a separate, fixed field — don't add your own name question here."
          actions={
            <SurveyDialog
              questions={settings.questions}
              eventName={settings.eventName}
              label="Preview survey"
              variant="ghost"
              size="sm"
            />
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
