import type { Express } from "express";
import type { Store } from "../store";
import { fail, text, integer } from "../validation";

export function registerExpenses(app: Express, { all, run }: Store) {
  app.get("/api/expenses", (_req, res) =>
    res.json(
      all("SELECT * FROM expenses ORDER BY id DESC").map((e) => ({
        ...e,
        participants: JSON.parse(e.participants as string),
      })),
    ),
  );
  app.post("/api/expenses", (req, res) => {
    const label = text(req.body.label, "Expense"),
      payer = text(req.body.payer, "Payer", 80),
      cents = integer(req.body.cents, "Amount in cents", 1);
    if (
      !Array.isArray(req.body.participants) ||
      !req.body.participants.length ||
      req.body.participants.length > 50
    )
      fail(400, "Provide 1–50 participants.");
    const participants = [
      ...new Set<string>(
        req.body.participants.map((v: unknown) => text(v, "Participant", 80)),
      ),
    ].sort();
    if (!participants.includes(payer))
      fail(400, "Payer must be included among participants.");
    const result = run(
      "INSERT INTO expenses(label,payer,cents,participants) VALUES(?,?,?,?)",
      label,
      payer,
      cents,
      JSON.stringify(participants),
    );
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  });
  app.get("/api/balances", (_req, res) => {
    const amounts = new Map<string, number>();
    for (const e of all("SELECT * FROM expenses ORDER BY id")) {
      const people: string[] = JSON.parse(e.participants as string);
      const cents = Number(e.cents),
        part = Math.floor(cents / people.length),
        remainder = cents % people.length;
      amounts.set(
        e.payer as string,
        (amounts.get(e.payer as string) ?? 0) + cents,
      );
      people.forEach((p, i) =>
        amounts.set(p, (amounts.get(p) ?? 0) - part - (i < remainder ? 1 : 0)),
      );
    }
    const balances = [...amounts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([person, cents]) => ({ person, cents }));
    const debtors = balances
      .filter((b) => b.cents < 0)
      .map((b) => ({ ...b, cents: -b.cents }));
    const creditors = balances
      .filter((b) => b.cents > 0)
      .map((b) => ({ ...b }));
    const settlements: { from: string; to: string; cents: number }[] = [];
    let i = 0,
      j = 0;
    while (i < debtors.length && j < creditors.length) {
      const cents = Math.min(debtors[i].cents, creditors[j].cents);
      settlements.push({
        from: debtors[i].person,
        to: creditors[j].person,
        cents,
      });
      debtors[i].cents -= cents;
      creditors[j].cents -= cents;
      if (!debtors[i].cents) i++;
      if (!creditors[j].cents) j++;
    }
    res.json({ balances, settlements });
  });
}
