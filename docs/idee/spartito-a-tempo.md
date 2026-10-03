# Idea: lettura a spartito a tempo

> Stato: **solo analisi, non implementato** (ottobre 2026).

Estendere l'esercizio di lettura a spartito (`SheetTrainer`) perché verifichi anche il
ritmo: si impostano i bpm, eventualmente suona un metronomo, e bisogna suonare le note
a tempo. Lo spartito dovrebbe contenere anche figure diverse dalle semiminime (minime,
crome, pause).

Conclusione: è fattibile e buona parte dell'infrastruttura c'è già. I punti delicati sono
quasi tutti sul lato audio.

## Le parti semplici

**Generare durate diverse.** Oggi `lib/sheet.ts` mette solo semiminime: ogni `Note`
occupa un movimento e `BEATS_PER_MEASURE` fa da contatore di note. Il cambio sarebbe:

- ogni elemento dello spartito diventa `{ note, duration }`;
- ogni battuta si riempie con figure ritmiche scelte da un insieme abilitabile dalle
  impostazioni (solo semiminime → minime → crome a coppie → pause);
- `measureOf` e `sheetNoteCount` vanno ricalcolate, perché il numero di note non è più
  battute × 4.

**Disegno.** VexFlow gestisce già durate, pause e travature delle crome
(`Beam.generateBeams`). In `components/SheetStaffDisplay.tsx` bisogna passare la durata
giusta invece di `'q'` e fare la larghezza della battuta proporzionale al tempo, non al
numero di note.

**Metronomo.** Si fa con la Web Audio API: i click si programmano in anticipo su
`audioContext.currentTime`, non con `setTimeout` (che non è abbastanza preciso). Più una
battuta di conteggio iniziale.

## Il cambio di impostazione

Oggi l'esercizio aspetta: la nota resta finché non è giusta e non c'è nessun limite di
tempo. In modalità ritmica comanda l'orologio:

- il cursore avanza da solo al tempo dei bpm, e si può far scorrere lo spartito in modo
  continuo invece che a scatti;
- una nota sbagliata o saltata viene segnata e si va avanti;
- ogni nota viene valutata su due cose: l'altezza e quanto si è in anticipo o in
  ritardo, per esempio "giusta", "un po' fuori" o "fuori" con tolleranze di circa
  ±50 / ±120 ms;
- il riepilogo finale mostra anche la precisione ritmica;
- le statistiche adattive (`lib/adaptive.ts`) oggi usano il tempo di risposta, che qui
  non ha senso: il ritmo andrebbe tenuto in statistiche a parte.

Si può rispondere anche con i bottoni, toccando la nota a tempo. È già un buon esercizio
e non ha nessun problema di latenza.

## I punti delicati (ingresso audio)

1. **Il momento in cui la nota viene registrata è in ritardo.** `useAudioInput`
   (`lib/audioInput.ts`) accetta una nota solo dopo `STABLE_FRAMES` (3 frame) stabili,
   più `ATTACK_SETTLE_MS` (60 ms), più una finestra di analisi di circa 46 ms. Quindi
   `at` arriva circa 100–150 ms dopo l'attacco reale, e il ritardo varia. Per misurare il
   tempo va usato il momento dell'attacco (`attackAt` esiste già nel codice), non quello
   in cui la nota viene accettata.

2. **Latenza dell'ingresso.** Scheda audio e browser aggiungono un ritardo che dipende dal
   dispositivo. Serve una calibrazione una tantum: si suonano alcune note sul click e
   l'app salva lo scarto medio. Senza calibrazione l'esercizio direbbe sempre "in
   ritardo". Metronomo e attacchi vanno misurati con lo stesso orologio
   (`audioContext.currentTime`, non `Date.now()`).

3. **Note veloci.** `LOCKOUT_MS = 350` impedisce di accettare due note entro 350 ms, ma
   una croma a 120 bpm dura 250 ms. In modalità ritmica il blocco va ridotto. In ogni
   caso il riconoscimento ha bisogno di circa 100 ms per nota, quindi con le crome il
   tempo massimo realistico è intorno ai 100–120 bpm.

4. **Il click nel microfono.** Con la chitarra collegata alla scheda audio nessun
   problema. Con il microfono il click del metronomo può essere scambiato per un attacco,
   quindi servono le cuffie oppure bisogna ignorare l'ingresso nell'istante del click.

5. **La durata vera della nota (quando si smette di suonarla).** È la parte meno
   affidabile. Su una chitarra la nota si spegne da sola: verificare che una minima sia
   stata tenuta per due movimenti è quasi impossibile e darebbe errori ingiusti. Sui
   fiati si potrebbe fare. Consiglio: valutare solo gli attacchi. La durata di una nota
   è già implicita nel momento in cui si attacca la successiva, ed è così che lavorano
   quasi tutti i trainer di lettura ritmica.

## Piano proposto, in tre passi

1. **Ritmo sullo spartito, ancora senza tempo:** figure miste (minime, crome, poi pause)
   generate e disegnate, mentre l'esercizio continua ad aspettare. Utile già da solo.
2. **Metronomo + cursore a tempo + risposta con i bottoni:** bpm, conteggio iniziale,
   voto su anticipo e ritardo.
3. **Tempo misurato dall'audio:** momento dell'attacco, calibrazione della latenza,
   blocco ridotto.
