import { describe, expect, it } from "vitest";
import { contactFormEmail } from "@/lib/email";
import { config } from "@/lib/config";

describe("contactFormEmail", () => {
  it("builds a message addressed to the contact inbox", () => {
    const mail = contactFormEmail(
      "Ada Lovelace",
      "ada@example.com",
      "Billing question",
      "Hi, I have a billing question about my premium plan."
    );
    expect(mail.to).toBe(config.contact.email);
    expect(mail.subject).toBe("[Contact] Billing question");
    expect(mail.tags).toContain("contact-form");
  });

  it("includes the sender and full message in both html and text", () => {
    const mail = contactFormEmail(
      "Ada Lovelace",
      "ada@example.com",
      "Press",
      "I'd like to write about NamesRanker."
    );
    expect(mail.text).toContain("Ada Lovelace");
    expect(mail.text).toContain("ada@example.com");
    expect(mail.text).toContain("I'd like to write about NamesRanker.");
    expect(mail.html).toContain("Ada Lovelace");
    expect(mail.html).toContain("I'd like to write about NamesRanker.");
  });

  it("escapes nothing dangerous into the subject prefix", () => {
    const mail = contactFormEmail("A B", "a@b.com", "Support", "Need help with my account.");
    expect(mail.subject.startsWith("[Contact] ")).toBe(true);
  });
});
