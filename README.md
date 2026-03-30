# Przychodzi Baba Do Lekarza

Przychodzi Baba Do Lekarza to MVP aplikacji dla lekarzy POZ, która zamienia krótką notatkę z wizyty na czytelną kartę wizyty z oddzieloną listą braków i sugestii.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth + Postgres + RLS
- OpenAI po stronie serwera z fallbackiem heurystycznym

## Lokalne uruchomienie

```bash
npm install
cp .env.example .env.local
npm run dev
```

Pełna konfiguracja usług zewnętrznych jest opisana w `docs/developer-setup.md`.

## Dostępne skrypty

```bash
npm run dev
npm run lint
npm run test
npm run build
```

## Baza danych

Schemat SQL dla Supabase i polityki RLS są w `supabase/schema.sql`.
