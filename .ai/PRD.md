# Dokument wymagań produktu (PRD) - Generator dokumentacji POZ MVP

## 1. Przegląd produktu

### Cel

Proste narzędzie webowe dla lekarzy POZ, które zamienia krótką, niestrukturalną notatkę z wizyty na czytelną kartę wizyty gotową do skopiowania.

### Użytkownik

- Użytkownik końcowy: lekarz POZ
- Odbiorca biznesowy: placówka POZ
- Etap: pilotaż wewnętrzny, bez płatności i bez integracji z EDM

### Główny workflow

1. Lekarz loguje się.
2. Wpisuje notatkę tekstową.
3. System rozwija prywatne skróty lekarza.
4. System porządkuje treść do sekcji dokumentacji.
5. System pokazuje:
	 - gotową dokumentację,
	 - osobną listę braków/sugestii.
6. Lekarz kopiuje gotowy wynik.
7. Lekarz może usunąć wygenerowany dokument.

## 2. Problem użytkownika

Lekarze zapisują dokumentację zbyt skrótowo i niestrukturalnie. Taka notatka:

- bywa nieczytelna dla innych,
- jest niepełna formalnie,
- wymaga dodatkowego czasu na redakcję.

Produkt ma skrócić i uprościć przygotowanie czytelnej karty wizyty bez dopowiadania nowych faktów medycznych.

## 3. Wymagania funkcjonalne

### 3.1 Wejście

- System przyjmuje wyłącznie tekst wpisany ręcznie przez lekarza.
- Wejście jest jednym blokiem tekstu bez wymaganych nagłówków.
- Brak limitu długości notatki w MVP.

### 3.2 Generowanie dokumentacji

- System generuje kartę wizyty POZ w sekcjach:
	- wywiad,
	- badanie,
	- rozpoznanie,
	- zalecenia.
- System automatycznie przypisuje fragmenty notatki do sekcji.
- System może wydzielić rozpoznanie z treści notatki, ale nie może dopowiadać nowych faktów.
- Jeśli treść jest niejednoznaczna, system ma zachować brzmienie możliwie bliskie notatce.
- Jeśli brak danych do sekcji, system pokazuje pustą sekcję lub znacznik „brak danych” - do decyzji w UI/specyfikacji szczegółowej.
- System generuje osobną listę sugestii braków w dokumentacji.

### 3.3 Zasady bezpieczeństwa

- System nie może dodawać nowych informacji klinicznych.
- Zalecenia mogą wynikać tylko z treści wpisanej przez lekarza.
- Lekarz zawsze odpowiada za weryfikację końcowego wyniku.
- System pokazuje stałe ostrzeżenie o konieczności weryfikacji.

### 3.4 Wynik i kopiowanie

- Gotowa dokumentacja jest prezentowana oddzielnie od sugestii.
- Sugestie nie mogą być kopiowane razem z dokumentacją.
- System udostępnia przycisk „Kopiuj”, kopiujący tylko gotową dokumentację.
- Lekarz nie edytuje dokumentu w aplikacji; może tylko go skopiować.

### 3.5 Skróty lekarza

- Każdy lekarz ma prywatny słownik skrótów.
- Skróty są zarządzane w ustawieniach.
- Skróty działają jako proste zamiany 1:1.
- Skróty są case-sensitive.
- Skróty działają globalnie w całej notatce.
- W MVP rekomendowane jest dopasowanie tylko pełnych tokenów, bez zgadywania.

### 3.6 Konta i dostęp

- Logowanie: e-mail + hasło.
- Konta tworzy ręcznie administrator wewnętrzny.
- Lekarz widzi tylko własne dane i własne skróty.
- Nie ma kont placówek ani panelu placówki w MVP.

### 3.7 Dane

- Dane pacjentów w pilotażu są fikcyjne.
- Baza danych: Supabase.
- Brak historii dokumentów.
- Użytkownik może usunąć wygenerowany dokument.
- Usunięty dokument ma zostać usunięty z bazy.
- Brak logów produktowych i analityki użytkowej w MVP.

## 4. Granice produktu

### W zakresie MVP

- logowanie lekarza,
- ręcznie wpisana notatka,
- generowanie karty wizyty,
- prywatny słownik skrótów,
- kopiowanie dokumentacji,
- usuwanie dokumentu,
- ręczne tworzenie kont przez admina.

### Poza zakresem MVP

- integracje z EDM,
- automatyczny zapis do zewnętrznych systemów,
- panel placówki,
- płatności i subskrypcje,
- limity użycia,
- współdzielony słownik skrótów,
- historia dokumentów,
- edycja dokumentu w aplikacji,
- uczenie się na poprawkach,
- ankiety i system ocen w aplikacji,
- obsługa innych języków niż polski.

## 5. Historyjki użytkowników

### US-001

- ID: US-001
- Tytuł: Logowanie lekarza
- Opis: Jako lekarz chcę zalogować się e-mailem i hasłem, aby korzystać z aplikacji.
- Kryteria akceptacji:
	- użytkownik może zalogować się poprawnymi danymi,
	- błędne dane blokują dostęp,
	- po zalogowaniu użytkownik widzi ekran główny.

### US-002

- ID: US-002
- Tytuł: Ograniczenie dostępu do własnych danych
- Opis: Jako lekarz chcę mieć dostęp tylko do własnych skrótów i swoich bieżących dokumentów.
- Kryteria akceptacji:
	- użytkownik nie widzi danych innych lekarzy,
	- każdy słownik skrótów jest przypisany do jednego konta.

### US-003

- ID: US-003
- Tytuł: Wpisanie notatki z wizyty
- Opis: Jako lekarz chcę wkleić lub wpisać notatkę jako jeden blok tekstu.
- Kryteria akceptacji:
	- system przyjmuje niestrukturalny tekst,
	- nagłówki nie są wymagane,
	- tekst można wysłać do generacji.

### US-004

- ID: US-004
- Tytuł: Rozwinięcie własnych skrótów
- Opis: Jako lekarz chcę, aby system rozwijał moje prywatne skróty.
- Kryteria akceptacji:
	- system stosuje zapisane skróty użytkownika,
	- dopasowanie jest case-sensitive,
	- skrót bez dokładnego dopasowania nie jest rozwijany.

### US-005

- ID: US-005
- Tytuł: Generowanie karty wizyty
- Opis: Jako lekarz chcę otrzymać gotową kartę wizyty POZ na podstawie notatki.
- Kryteria akceptacji:
	- wynik zawiera sekcje: wywiad, badanie, rozpoznanie, zalecenia,
	- system przypisuje treść do sekcji automatycznie,
	- system nie dodaje nowych faktów medycznych.

### US-006

- ID: US-006
- Tytuł: Wydzielanie rozpoznania z tekstu
- Opis: Jako lekarz chcę, aby system potrafił wydzielić rozpoznanie ukryte w treści notatki.
- Kryteria akceptacji:
	- system może przenieść treść do sekcji „rozpoznanie”,
	- treść musi wynikać z notatki,
	- system nie tworzy nowych rozpoznań.

### US-007

- ID: US-007
- Tytuł: Bezpieczne zachowanie przy niejasnym tekście
- Opis: Jako lekarz chcę, aby system nie zgadywał, gdy czegoś nie rozumie.
- Kryteria akceptacji:
	- niejasny fragment pozostaje możliwie bliski oryginałowi,
	- system nie dopisuje brakujących faktów,
	- system nie używa placeholderów, jeśli nie są wymagane przez finalny UI.

### US-008

- ID: US-008
- Tytuł: Sugestie braków
- Opis: Jako lekarz chcę widzieć osobno, czego może brakować w dokumentacji.
- Kryteria akceptacji:
	- sugestie są pokazane pod dokumentacją,
	- sugestie są wizualnie oddzielone,
	- sugestie nie są kopiowane z dokumentacją.

### US-009

- ID: US-009
- Tytuł: Kopiowanie gotowej dokumentacji
- Opis: Jako lekarz chcę jednym kliknięciem skopiować tylko gotową dokumentację.
- Kryteria akceptacji:
	- istnieje przycisk „Kopiuj”,
	- kopiowana jest tylko dokumentacja,
	- sugestie braków nie trafiają do schowka.

### US-010

- ID: US-010
- Tytuł: Ostrzeżenie o weryfikacji
- Opis: Jako lekarz chcę widzieć informację, że wynik wymaga sprawdzenia przed użyciem.
- Kryteria akceptacji:
	- ostrzeżenie jest widoczne przy wyniku,
	- ostrzeżenie pojawia się przy każdej generacji.

### US-011

- ID: US-011
- Tytuł: Zarządzanie skrótami
- Opis: Jako lekarz chcę dodawać i usuwać własne skróty w ustawieniach.
- Kryteria akceptacji:
	- użytkownik może dodać skrót i rozwinięcie,
	- użytkownik może usunąć skrót,
	- zmiany są zapisane do kolejnych użyć.

### US-012

- ID: US-012
- Tytuł: Usunięcie wygenerowanego dokumentu
- Opis: Jako lekarz chcę usunąć wygenerowany dokument po użyciu.
- Kryteria akceptacji:
	- użytkownik może usunąć dokument,
	- po usunięciu dokument znika z widoku,
	- po usunięciu dokument znika z bazy.

### US-013

- ID: US-013
- Tytuł: Ręczne tworzenie kont przez admina
- Opis: Jako administrator chcę ręcznie tworzyć konta lekarzy na potrzeby pilotażu.
- Kryteria akceptacji:
	- admin może utworzyć konto lekarza,
	- konto zawiera e-mail i hasło/startowe dane dostępu,
	- nowe konto może się zalogować.

### US-014

- ID: US-014
- Tytuł: Usuwanie użytkownika przez admina
- Opis: Jako administrator chcę usunąć konto użytkownika, jeśli przestaje brać udział w pilotażu.
- Kryteria akceptacji:
	- admin może usunąć konto,
	- usunięty użytkownik traci dostęp,
	- dane użytkownika są usuwane zgodnie z przyjętym zakresem MVP.

### US-015

- ID: US-015
- Tytuł: Reset hasła przez admina
- Opis: Jako administrator chcę zresetować hasło lekarza, aby przywrócić mu dostęp.
- Kryteria akceptacji:
	- admin może zresetować hasło,
	- użytkownik może zalogować się nowym hasłem,
	- stare hasło przestaje działać.

## 6. Metryki sukcesu

Na etapie MVP metryki są lekkie i głównie jakościowe.

### Główne metryki

- Lekarz ocenia, że wynik jest czytelny i użyteczny po weryfikacji.
- Lekarz ocenia, że narzędzie upraszcza przygotowanie karty wizyty.
- Wygenerowany wynik zwykle wymaga tylko drobnych poprawek poza aplikacją.
- Sugestie braków są pomocne i nie przeszkadzają w kopiowaniu.

### Pomiar

- bezpośredni feedback od lekarzy w pilotażu,
- krótkie rozmowy lub ręcznie zbierane opinie,
- obserwacja, czy workflow „wpisz → generuj → kopiuj” jest wystarczający.

### Otwarte kwestie do doprecyzowania po pilotażu

- finalna kolejność sekcji,
- reguła „brak danych”,
- dokładna tokenizacja skrótów przy interpunkcji,
- minimalny zestaw błędów krytycznych,
- ewentualne KPI ilościowe w kolejnej wersji.

### Kontrola kompletności

- Każdą historyjkę użytkownika można przetestować.
- Kryteria akceptacji są konkretne.
- Ujęto główne scenariusze, scenariusze alternatywne i podstawowe edge case’y.
- Ujęto uwierzytelnianie i podstawową autoryzację.

## 7. Rekomendowany tech stack

### Założenia architektoniczne

- MVP powinno być wdrożone jako jedna aplikacja full-stack, bez rozdzielania na osobny frontend i osobny backend.
- Priorytetem jest prostota utrzymania, szybkie wdrożenie pilotażu oraz bezpieczna obsługa danych per użytkownik.
- Cała logika wywołująca model AI powinna działać po stronie serwera.

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend i logika aplikacyjna

- Next.js Route Handlers lub Server Actions
- TypeScript po stronie serwera do rozwijania skrótów i przygotowania danych wejściowych do generacji
- Zod do walidacji danych wejściowych i odpowiedzi modelu

### Baza danych i uwierzytelnianie

- Supabase Postgres jako główna baza danych
- Supabase Auth dla logowania e-mail + hasło
- Row Level Security do ograniczenia dostępu użytkownika wyłącznie do własnych skrótów i własnych dokumentów

### Generowanie dokumentacji

- Integracja z zewnętrznym modelem LLM przez API, wywoływana wyłącznie po stronie serwera
- Odpowiedź modelu powinna mieć wymuszony format strukturalny, najlepiej JSON
- Pipeline generacji powinien wyglądać następująco:
	1. rozwinięcie prywatnych skrótów lekarza metodą 1:1,
	2. przekazanie rozszerzonej notatki do modelu z restrykcyjnymi regułami bezpieczeństwa,
	3. walidacja odpowiedzi,
	4. render sekcji: wywiad, badanie, rozpoznanie, zalecenia oraz osobnej listy sugestii braków.

### Hosting i infrastruktura

- Vercel do hostowania aplikacji Next.js
- Supabase jako hostowana warstwa danych i autoryzacji
- Sekrety i klucze API przechowywane wyłącznie w zmiennych środowiskowych po stronie serwera

### Testy i jakość

- Vitest do testów jednostkowych logiki rozwijania skrótów, walidacji i formatowania danych
- Playwright do testów end-to-end dla głównych scenariuszy: logowanie, generacja, kopiowanie, usuwanie dokumentu, zarządzanie skrótami

### Założenia niefunkcjonalne dla MVP

- Brak wywołań modelu AI bezpośrednio z przeglądarki
- Brak integracji z systemami EDM w MVP
- Brak analityki produktowej i trackingowych SDK po stronie klienta w MVP
- Ręczne operacje administracyjne mogą być realizowane przez panel Supabase lub prosty wewnętrzny interfejs admina, bez rozbudowanego panelu placówki