import { useEffect, useRef, useState } from "react";
import { Bot, Check, CircleAlert, Download, ListChecks, LoaderCircle, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Card } from "./ui";
import { getAgentRun, getConversationAgentRun, sendAgentMessage, streamAgentRun, type AgentMessage, type AgentRun, type AgentRunStep } from "../storage";
import { LatticeLoader } from "./lattice-loader";

const starters = ["Test the complete product purchase flow", "Check every visible button", "Explore this screen and report issues"];

function reportSections(content: string) {
  const matches = [...content.matchAll(/^##\s+(.+?)\s*\n([\s\S]*?)(?=^##\s+|$)/gm)];
  return matches.length ? matches.map((match) => ({ title: match[1].trim(), content: match[2].trim() })) : [{ title: "Report", content }];
}

function downloadReport(content: string) {
  const file = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cotester-report-${new Date().toISOString().slice(0, 10)}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ReportMessage({ content }: { content: string }) {
  const sections = reportSections(content);
  return <div className="agent-report">
    <div className="agent-report-toolbar"><span>Test report</span><button type="button" onClick={() => downloadReport(content)} aria-label="Download test report" title="Download Markdown report"><Download size={14} /> Download</button></div>
    {sections.map((section, index) => <section key={`${section.title}-${index}`} className={`agent-report-section report-${section.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}><h3>{section.title}</h3><div className="agent-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown></div></section>)}
  </div>;
}

function agentFailureMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "The agent could not complete this request.";
  if (/previous response|AI provider|response not found/i.test(message)) return "CoTester could not reach the AI test harness. Your app session is still safe—send the request again in a moment.";
  if (/not running|start this app|Android startup/i.test(message)) return "CoTester could not prepare the Android session. It will start a fresh session on your next request; keep this page open while the emulator finishes starting.";
  if (/longer than 45 seconds|timed out|abort/i.test(message)) return "CoTester stopped waiting for a slow harness response. Your app session is still safe—send the request again or narrow the test scope.";
  return message;
}

export function AgentChat({ sessionId, ensureSession, conversationId, messages, onMessagesChange, onCreditsChange, onError }: { sessionId?: string; ensureSession?(): Promise<{ id: string }>; conversationId: string; messages: AgentMessage[]; onMessagesChange(messages: AgentMessage[]): void; onCreditsChange?(remaining: number): void; onError?(message: string): void }) {
  const [draft, setDraft] = useState("");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"starting" | "testing" | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [usage, setUsage] = useState<{ credits: number; input: number; output: number } | null>(null);
  const [trace, setTrace] = useState<AgentRunStep[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef(messages);
  const stopStreamRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<number | null>(null);
  useEffect(() => { messageRef.current = messages; }, [messages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, running]);
  const stopRunUpdates = () => {
    stopStreamRef.current?.();
    stopStreamRef.current = null;
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    pollRef.current = null;
  };
  const applyRun = (run: AgentRun) => {
    setTrace(run.events.length ? run.events.map(({ label, detail, state }) => ({ label, detail, state })) : run.trace);
    if (run.status === "queued" || run.status === "running") { setRunning(true); setPhase(run.status === "queued" ? "starting" : "testing"); return; }
    setRunning(false); setPhase(null);
    if (run.status === "succeeded" && run.answer) {
      const current = messageRef.current;
      if (!current.some((message) => message.role === "assistant" && message.content === run.answer)) onMessagesChange([...current, { role: "assistant", content: run.answer }]);
      if (run.creditsUsed !== null && run.inputTokens !== null && run.outputTokens !== null) setUsage({ credits: run.creditsUsed, input: run.inputTokens, output: run.outputTokens });
    }
    if (run.status === "failed") onError?.(run.error || "CoTester could not complete this queued run.");
    stopRunUpdates();
  };
  const watchRun = (runId: string) => {
    stopRunUpdates();
    stopStreamRef.current = streamAgentRun(runId, applyRun, () => { void getAgentRun(runId).then(({ run }) => applyRun(run)).catch(() => undefined); });
    // EventSource gives immediate progress. This small status fallback makes
    // terminal completion resilient to a proxy, sleep, or dropped SSE event.
    pollRef.current = window.setInterval(() => {
      void getAgentRun(runId).then(({ run }) => applyRun(run)).catch(() => undefined);
    }, 1800);
  };
  useEffect(() => {
    let active = true;
    void getConversationAgentRun(conversationId).then(({ run }) => {
      if (!active || !run) return;
      applyRun(run);
      if (run.status === "queued" || run.status === "running") watchRun(run.id);
    }).catch(() => undefined);
    return () => { active = false; stopRunUpdates(); };
  }, [conversationId]);
  const submit = async (value = draft) => {
    const content = value.trim();
    if (!content || running) return;
    let queued = false;
    const next = [...messages, { role: "user" as const, content }];
    onMessagesChange(next); setDraft(""); setTrace([]); setRunning(true); setPhase(sessionId ? "testing" : "starting");
    try {
      let activeSession = sessionId ? { id: sessionId } : await ensureSession?.();
      if (!activeSession) throw new Error("Select an app before starting a CoTester run.");
      setPhase("testing");
      // The server is the context source of truth; only the new user turn is
      // transmitted. This avoids replaying a growing browser transcript.
      let result;
      try { result = await sendAgentMessage(activeSession.id, conversationId, [next.at(-1)!]); }
      catch (reason) {
        if (!/no longer running|not running/i.test(reason instanceof Error ? reason.message : "")) throw reason;
        activeSession = await ensureSession?.();
        if (!activeSession) throw reason;
        result = await sendAgentMessage(activeSession.id, conversationId, [next.at(-1)!]);
      }
      applyRun(result.run);
      watchRun(result.run.id);
      queued = true;
    } catch (reason) { onError?.(agentFailureMessage(reason)); }
    finally { if (!queued) { setRunning(false); setPhase(null); } }
  };
  return <Card className="agent-chat">
    <header className="agent-chat-header"><div><span className="agent-status"><Bot size={14} /> CoTester</span><h2>Your testing copilot</h2><p>It uses the session-scoped MCP tools automatically.</p></div><b>{credits === null ? "Token-priced" : `${credits} credits left`}</b></header>
    <div className="agent-message-list" ref={scrollRef} aria-live="polite">
      {!messages.length && <div className="agent-empty"><Bot size={20} /><strong>What should I test?</strong><span>Pick a prompt or describe a flow in your own words.</span><div>{starters.map((starter) => <button type="button" key={starter} onClick={() => submit(starter)}>{starter}</button>)}</div></div>}
      {messages.map((message, index) => <article key={`${message.role}-${index}`} className={`agent-message ${message.role}`}><span>{message.role === "user" ? "You" : "CoTester"}</span>{message.role === "assistant" ? <ReportMessage content={message.content} /> : <p>{message.content}</p>}</article>)}
      {running && <article className="agent-message assistant agent-progress"><span>CoTester</span>{phase === "starting" ? <LatticeLoader label="Queued securely for the CoTester worker" detail="This run is saved. You can leave or refresh this page while the worker begins." /> : <><div className="agent-live-plan"><ListChecks size={15} /><div><strong>Testing with the session tools</strong><small>Live activity, tool use, and the final report are being saved to this chat.</small></div></div><LatticeLoader label="Running your requested checks" detail="Inspecting the current screen and collecting evidence." /></>}</article>}
      {!!trace.length && <article className="agent-run-trace" aria-label="CoTester run activity"><strong>{running ? "Live run activity" : "Run activity"}</strong>{trace.map((step, index) => <div key={`${step.label}-${index}`} className={step.state}><span>{step.state === "blocked" ? <CircleAlert size={14} /> : step.state === "working" ? <LoaderCircle className="agent-spin" size={14} /> : <Check size={14} />}</span><div><b>{step.label}</b><small>{step.detail}</small></div></div>)}</article>}
    </div>
    <form className="agent-composer" onSubmit={(event) => { event.preventDefault(); submit(); }}><div className="agent-input-shell"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask CoTester to test this app…" rows={2} maxLength={6000} disabled={running} /><Button type="submit" disabled={running || !draft.trim()} aria-label="Send test request"><Send size={16} /> Send</Button></div></form>
    <small>{usage ? `Last run: ${usage.credits} credits · ${usage.input.toLocaleString()} input + ${usage.output.toLocaleString()} output tokens.` : "Credits are calculated from input and output tokens after each completed run."} Actions remain restricted to this running session.</small>
  </Card>;
}
