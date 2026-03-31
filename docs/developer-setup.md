# Przychodzi Baba Do Lekarza: konfiguracja dla developera

## 1. Wymagania lokalne

- Node.js 22+
- npm 11+
- konto Supabase
- opcjonalnie konto OpenAI do generacji przez LLM

## 2. Zmienne środowiskowe

1. Skopiuj `.env.example` do `.env.local`.
2. Uzupełnij:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Uwagi:

- `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY` są wymagane do logowania i pracy z bazą.
- `OPENAI_API_KEY` jest opcjonalny. Jeśli go nie podasz, aplikacja użyje lokalnego heurystycznego generatora, żeby dało się rozwijać UI i logikę bez dostępu do modelu.

## 3. Supabase

### Projekt

1. Utwórz nowy projekt Supabase.
2. W `Project Settings -> API` skopiuj URL i anon key do `.env.local`.
3. W `Authentication -> Sign In / Providers` włącz `Email`.

### Schemat bazy i RLS

1. Otwórz SQL Editor.
2. Uruchom zawartość pliku `supabase/schema.sql`.

To utworzy:

- tabelę `abbreviations` z prywatnym słownikiem skrótów per użytkownik,
- tabelę `medical_documents` przechowującą tylko bieżący dokument użytkownika,
- tabelę `user_prompt_preferences` z promptami AI zapisywanymi per konto lekarza,
- polityki RLS ograniczające dostęp do własnych danych.

Ważne ograniczenie MVP:

- aplikacja przechowuje tylko ostatnią notatkę użytkownika,
- w danym momencie można mieć tylko jeden aktywny dokument,
- wygenerowanie nowej notatki usuwa poprzedni dokument tego użytkownika.

### Konta lekarzy i operacje administracyjne

W MVP administracja jest ręczna, bez panelu w aplikacji.

Tworzenie kont:

1. Wejdź w `Authentication -> Users`.
2. Użyj `Create user`.
3. Wpisz e-mail i hasło startowe.

Reset hasła:

1. `Authentication -> Users`.
2. Wybierz użytkownika.
3. Ustaw nowe hasło ręcznie.

Usunięcie użytkownika:

1. Usuń konto w `Authentication -> Users`.
2. Dzięki `on delete cascade` powiązane skróty i dokument znikną automatycznie.

## 4. OpenAI

Warstwa AI działa wyłącznie po stronie serwera. Żaden klucz nie jest używany w przeglądarce.

Minimalna konfiguracja:

1. Wygeneruj klucz API.
2. Dodaj `OPENAI_API_KEY` do `.env.local`.
3. Opcjonalnie ustaw `OPENAI_MODEL` na model obsługujący structured outputs.

Domyślnie kod używa `gpt-4o-mini`. Jeśli w Twoim koncie inny model lepiej wspiera structured output, podmień go przez env.

## 5. Uruchomienie

```bash
npm install
npm run dev
```

Adres lokalny: `http://localhost:3000`

## 6. Testy i kontrola jakości

```bash
npm run lint
npm run test
npm run build
```

## 7. Co jest zaimplementowane bez zewnętrznej konfiguracji

- UI aplikacji,
- logika rozwijania skrótów,
- heurystyczny fallback generatora,
- testy jednostkowe logiki domenowej.

## 8. Co wymaga podłączenia Supabase

- logowanie lekarza,
- trwały zapis skrótów,
- zapis i usuwanie wygenerowanego dokumentu,
- autoryzacja per użytkownik.