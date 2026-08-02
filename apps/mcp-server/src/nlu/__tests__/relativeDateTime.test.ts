import { describe, expect, it } from "vitest";
import { resolveRelativeDateTime } from "../relativeDateTime.js";

describe("resolveRelativeDateTime", () => {
  it("resolves 'tonight' to today at 7pm", () => {
    const now = new Date("2026-08-05T10:00:00");
    const result = resolveRelativeDateTime("somewhere fun tonight", now);
    expect(result).toBeDefined();
    const resolved = new Date(result!.iso);
    expect(resolved.getDate()).toBe(now.getDate());
    expect(resolved.getHours()).toBe(19);
  });

  it("resolves 'tomorrow evening' to the next day at 7pm", () => {
    const now = new Date("2026-08-05T10:00:00");
    const result = resolveRelativeDateTime("tomorrow evening", now);
    const resolved = new Date(result!.iso);
    expect(resolved.getDate()).toBe(now.getDate() + 1);
    expect(resolved.getHours()).toBe(19);
  });

  it("resolves an explicit weekday and time", () => {
    const now = new Date("2026-08-05T10:00:00"); // a Wednesday
    const result = resolveRelativeDateTime("Friday at 7pm", now);
    const resolved = new Date(result!.iso);
    expect(resolved.getDay()).toBe(5); // Friday
    expect(resolved.getHours()).toBe(19);
  });

  it("resolves lunch to 1pm", () => {
    const now = new Date("2026-08-05T10:00:00");
    const result = resolveRelativeDateTime("lunch today", now);
    const resolved = new Date(result!.iso);
    expect(resolved.getHours()).toBe(13);
  });

  it("returns undefined when nothing about timing is mentioned", () => {
    expect(resolveRelativeDateTime("somewhere with good burgers", new Date())).toBeUndefined();
  });

  it("handles 24-hour explicit times", () => {
    const now = new Date("2026-08-05T10:00:00");
    const result = resolveRelativeDateTime("tonight at 19:30", now);
    const resolved = new Date(result!.iso);
    expect(resolved.getHours()).toBe(19);
    expect(resolved.getMinutes()).toBe(30);
  });
});
