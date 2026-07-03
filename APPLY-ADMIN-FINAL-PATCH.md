# Apply the Edvixa admin final patch

From the Edvixa project root:

```bash
unzip -o ~/Downloads/edvixa-admin-final-audit-fix.zip
```

When Vite and `tsx watch` are already running, both should reload automatically. No second `npm run dev` is needed.

Optional verification in another terminal:

```bash
npm run typecheck
npm test
npm run build
```

Optional demo-data refresh:

```bash
npm run seed
```

Rerunning the seed updates the five built-in approved demo teachers with submitted status, grade levels, and a demo qualification document. It does not remove separately created accounts.

The patch intentionally does not rewrite previously recorded refund or payout actions. A fee row marked **Needs reconciliation** should be checked against the audit log and payment-provider state.
