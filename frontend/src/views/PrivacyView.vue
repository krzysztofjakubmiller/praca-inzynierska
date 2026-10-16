<script setup lang="ts">
import '@/assets/legal.css'
</script>

<template>
  <main class="legal">
    <h1>Polityka prywatności</h1>
    <p class="legal__date">Obowiązuje od 16 października 2026 r.</p>

    <h2>Kto odpowiada za dane</h2>
    <p>
      Administratorem danych osobowych jest Krzysztof Miller, autor aplikacji Matma po kolei.
      Kontakt: pomoc@matmapokolei.pl.
    </p>

    <h2>Jakie dane zbieramy i po co</h2>
    <ul>
      <li>
        Adres e-mail: do założenia konta, logowania i wysyłki maili potrzebnych do działania konta
        (potwierdzenie adresu, ustawienie hasła).
      </li>
      <li>Hasło: zapisujemy tylko jego skrót (Argon2id), samego hasła nie zna nikt poza Tobą.</li>
      <li>
        Przy logowaniu przez Google: identyfikator konta Google i adres e-mail. Google przekazuje
        też imię i zdjęcie profilowe, ale ich nie zapisujemy.
      </li>
      <li>
        Sesje logowania: losowy klucz w ciasteczku i jego skrót w bazie, dzięki którym nie trzeba
        logować się przy każdym wejściu.
      </li>
      <li>Datę akceptacji regulaminu.</li>
      <li>Dane wpisane w profilu, np. poziom i rok matury, oraz wyniki nauki w aplikacji.</li>
    </ul>
    <p>
      Dane przetwarzamy, żeby świadczyć usługę opisaną w regulaminie (art. 6 ust. 1 lit. b RODO).
      Nie sprzedajemy ich i nie używamy do reklam.
    </p>

    <h2>Komu przekazujemy dane</h2>
    <p>Korzystamy z firm, które przetwarzają dane na nasze zlecenie:</p>
    <ul>
      <li>Render: serwery i baza danych aplikacji, położone we Frankfurcie (Niemcy);</li>
      <li>Brevo (Francja): wysyłka maili z aplikacji;</li>
      <li>ImprovMX: przekazywanie wiadomości wysłanych na pomoc@matmapokolei.pl.</li>
    </ul>
    <p>
      Logowanie przez Google odbywa się na zasadach Google. Strony logowania i rejestracji wczytują
      skrypt Google, więc Google widzi wejście na te dwie strony.
    </p>

    <h2>Jak długo przechowujemy dane</h2>
    <ul>
      <li>Konto i jego dane: do usunięcia konta.</li>
      <li>Niepotwierdzona rejestracja: link traci ważność po 24 godzinach.</li>
      <li>Link do ustawienia hasła: godzinę.</li>
      <li>Sesja logowania: 14 dni od ostatniego użycia na danym urządzeniu.</li>
      <li>Kopie zapasowe bazy obejmują ostatnie 3 dni, więc usunięte dane znikają z nich po tym czasie.</li>
    </ul>

    <h2>Ciasteczka i pamięć przeglądarki</h2>
    <p>
      Używamy jednego ciasteczka, z kluczem sesji, bez którego nie da się być zalogowanym. W pamięci
      przeglądarki zapisujemy hasło dostępu do wersji testowej i wybrany motyw. Nie używamy
      ciasteczek reklamowych ani analitycznych.
    </p>

    <h2>Twoje prawa</h2>
    <p>
      Masz prawo do dostępu do swoich danych, ich poprawienia, usunięcia, ograniczenia
      przetwarzania i przeniesienia oraz do sprzeciwu. Konto usuniesz sam na stronie Konto; w
      pozostałych sprawach napisz na pomoc@matmapokolei.pl. Masz też prawo złożyć skargę do Prezesa
      Urzędu Ochrony Danych Osobowych.
    </p>

    <h2>Zmiany</h2>
    <p>O zmianie polityki prywatności informujemy mailem i na tej stronie.</p>
  </main>
</template>
