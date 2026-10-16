<script setup lang="ts">
import '@/assets/legal.css'
</script>

<template>
  <main class="legal">
    <h1>Regulamin</h1>
    <p class="legal__date">Obowiązuje od 16 października 2026 r.</p>

    <h2>Aplikacja</h2>
    <p>
      Matma po kolei (matmapokolei.pl) pomaga przygotować się do matury z matematyki. Aplikację
      prowadzi Krzysztof Miller, kontakt: pomoc@matmapokolei.pl. Aplikacja jest w fazie testów i w
      tym czasie korzystanie z niej jest bezpłatne.
    </p>

    <h2>Konto</h2>
    <ul>
      <li>Konto może założyć osoba, która ukończyła 16 lat.</li>
      <li>Do założenia konta potrzebny jest adres e-mail z hasłem albo konto Google.</li>
      <li>Jedno konto należy do jednej osoby. Nie udostępniaj innym swojego hasła.</li>
      <li>Konto można w każdej chwili usunąć na stronie Konto.</li>
    </ul>

    <h2>Zasady korzystania</h2>
    <p>Nie wolno:</p>
    <ul>
      <li>próbować dostać się do cudzych kont ani do części aplikacji, do których nie ma się dostępu;</li>
      <li>obciążać aplikacji automatycznymi zapytaniami;</li>
      <li>kopiować treści aplikacji w celu udostępniania ich dalej.</li>
    </ul>
    <p>
      Konto, z którego korzysta się wbrew tym zasadom, może zostać zablokowane. O blokadzie
      informujemy mailem.
    </p>

    <h2>Działanie aplikacji</h2>
    <p>
      W fazie testów mogą zdarzać się przerwy i błędy. Aplikacja pomaga w nauce, ale nie
      gwarantuje wyniku matury.
    </p>

    <h2>Uwagi i reklamacje</h2>
    <p>
      Uwagi i reklamacje można wysłać na pomoc@matmapokolei.pl. Odpowiadamy w ciągu 14 dni.
    </p>

    <h2>Zmiany regulaminu</h2>
    <p>
      O zmianie regulaminu informujemy mailem co najmniej 7 dni przed jej wejściem w życie. Kto się
      z nią nie zgadza, może usunąć konto.
    </p>

    <h2>Dane osobowe</h2>
    <p>
      Zasady przetwarzania danych opisuje
      <RouterLink :to="{ name: 'privacy' }">polityka prywatności</RouterLink>. W sprawach
      nieuregulowanych w regulaminie stosuje się prawo polskie.
    </p>
  </main>
</template>
