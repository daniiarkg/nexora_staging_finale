"use client";

import { FormEvent, useState } from "react";
import type { LeadFormText } from "@/lib/types";

type LeadFormProps = {
  accessKey: string;
  interest: string;
  button: string;
  labels: LeadFormText;
};

function leadMessage(payload: { name: string; email: string; phone: string; interest: string; source: string }, labels: LeadFormText) {
  return [
    labels.messageIntro,
    "",
    `Направление: ${payload.interest || labels.interestFallback}`,
    `Страница: ${payload.source}`,
    `${labels.nameLabel}: ${payload.name}`,
    `${labels.emailLabel}: ${payload.email}`,
    `${labels.phoneLabel}: ${payload.phone}`
  ].join("\n");
}

export function LeadForm({ accessKey, interest, button, labels }: LeadFormProps) {
  const [status, setStatus] = useState("");
  const [state, setState] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      interest,
      source: window.location.pathname
    };

    formData.set("access_key", accessKey);
    formData.set("subject", `${labels.subjectPrefix}: ${interest}`);
    formData.set("from_name", labels.fromName);
    formData.set("message", leadMessage(payload, labels));
    formData.set("source", payload.source);
    formData.set("lang", "ru");

    setStatus(labels.pendingStatus);
    setState("pending");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        form.reset();
        setStatus(labels.successStatus);
        setState("success");
        return;
      }

      throw new Error(result.message || "lead_failed");
    } catch {
      setStatus(labels.fallbackStatus);
      setState("pending");
      HTMLFormElement.prototype.submit.call(form);
    }
  }

  return (
    <form className="lead-form reveal" action="https://api.web3forms.com/submit" method="POST" onSubmit={submit}>
      <input type="hidden" name="access_key" value={accessKey} />
      <input type="hidden" name="interest" value={interest} />
      <label>
        <span>{labels.nameLabel}</span>
        <input name="name" type="text" autoComplete="name" required />
      </label>
      <label>
        <span>{labels.emailLabel}</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>{labels.phoneLabel}</span>
        <input name="phone" type="tel" autoComplete="tel" required />
      </label>
      <button className="primary-button" type="submit">
        {button}
      </button>
      <p className="form-status" data-state={state} role="status">
        {status}
      </p>
    </form>
  );
}
