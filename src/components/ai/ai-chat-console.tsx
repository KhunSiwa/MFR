"use client";

import { FormEvent, useRef, useState } from "react";
import { Bot, Loader2, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const starterMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "สวัสดีครับ ผมคือผู้ช่วย AI ของ M.F.R. ถามผมได้เรื่องสรุปแดชบอร์ด จุดเสี่ยง การตรวจจับรอยแตกร้าว สนิม โมดูล telemetry หรือคำแนะนำบำรุงรักษา",
  },
];

const suggestions = [
  "สรุปแดชบอร์ดตอนนี้",
  "โซนไหนเสี่ยงที่สุด",
  "พบรอยแตกร้าวกี่จุด",
  "แนะนำการบำรุงรักษา",
  "สถานะ telemetry ของหุ่นยนต์",
  "มีโมดูลอะไรบ้าง",
];

export function AiChatConsole() {
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await response.json()) as { reply?: string };

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply ?? "ขออภัยครับ ตอนนี้ AI ยังตอบคำถามนี้ไม่ได้",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "เชื่อมต่อ AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้งครับ",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-200">
              <Bot className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <CardTitle>แชต AI ของ M.F.R.</CardTitle>
              <CardDescription>คุยกับ AI เพื่ออ่านข้อมูลการตรวจสอบ หุ่นยนต์ โมดูล และการบำรุงรักษา</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-[560px] flex-col rounded-[1.25rem] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950/60">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-500" aria-hidden />
                  AI กำลังวิเคราะห์ข้อมูล...
                </div>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3 dark:border-white/10">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="ถาม AI เช่น โซนไหนเสี่ยงที่สุด?"
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-white/10 dark:bg-slate-900"
                />
                <Button type="submit" className="h-12 rounded-2xl px-5" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" aria-hidden />
                  ส่ง
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ตัวอย่างคำถาม</CardTitle>
          <CardDescription>กดเพื่อส่งคำถามให้ AI ทันที</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void sendMessage(suggestion)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.06]"
            >
              {suggestion}
            </button>
          ))}
          <div className="rounded-2xl bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-800 dark:text-cyan-100">
            เวอร์ชันนี้เป็น AI demo ภายในโปรเจกต์ ยังไม่ส่งข้อมูลออกไปข้างนอก และตอบจาก mock data ของ M.F.R.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-200">
          <Bot className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
      <div
        className={`max-w-[82%] whitespace-pre-line rounded-[1.25rem] px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "bg-cyan-600 text-white"
            : "border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
        }`}
      >
        {message.content}
      </div>
      {isUser ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200">
          <UserRound className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}
