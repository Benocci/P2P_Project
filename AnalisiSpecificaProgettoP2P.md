# Progetto finale P2P Systems and Blockchains - Hit and Sunk

## Descrizione del progetto

Due giocatori che non possono vedere l'uno la board dell'altro fino alla fine del gioco. Due fasi di gioco:

- fase di piazzamento delle navi(placement phase): ogni giocatore piazza k navi di varie lunghezze e larghezza fissa sulla board. Una matrice n per n rappresenta il campo di gioco.

- fase di lancio dei missili (shooting fase): ogni giocatore durante il suo turno cerca di indovinare la locazione delle navi dell'avversario sulla board opposta. Per indovinare indica le coordinate [i,j] di una zona della board. Se la nave è stata colpita l'opponente risponde con "Hit!" altrimenti "Miss!". Quando tutte le caselle di una nave sono state colpite la nave viene considerata affondata "stunk".

Il gioco termina quando uno dei due giocatori ha tutte le navi affondate.

Il progetto richiede l'implementazione di un gioco di battaglia navale sulla blockchain Ethereum. Questo permette di utilizzare le proprietà della blockchain come resistenza alle anomalie, possibilità di auditing, inclusione negli smart contracts, pagamento sicuro e istantaneo. Implementare il gioco su una blockchain priva di permessi implica che la partecipazione non può essere prevenuta da nessuno non essendoci un'autorità censoria.

![](/home/francesco/.config/marktext/images/2023-06-17-16-11-51-image.png)

## Implementazione sulla blockchain

Finché la Blockchain mantiene un libro mastro pubblico un giocatore non può pubblicare il contenuto della sua board su libro mastro altrimenti l'avversario può leggere la Blockchain e sapere dove colpire. La Blockchain però viene sfruttata per:

1. garantire che la scelta iniziale della locazione delle navi fatta nella fase di piazzamento non venga modificata da un cheater dopo questa fase;

2. garantire che il piazzamento iniziale delle navi sia valido;

3. garantire che ad ogni turno il giocatore non bari sull'esatto risultato dello sparo precedente fatto dall'avversario;

4. implementare un sistema di ricompensa per il vincitore attraverso tokens o cryptovalute salvate nel bilancio dello smart contract;

5. definire un meccanismo di penalità per i giocatori scorretti e per i giocatori che non fanno le loro mossi che bloccano il deposito di soldi nello smart contract.

### Fase di piazzamento delle navi

Per soddisfare il requisito 1. un giocatore deve piazzare le navi sulla board e dopo deve sottoporre la board sulla blockchain senza esporre i valori delle locazioni delle navi. La sottoposizione consiste nell'eseguire un Merkle tree e salvare nello smart cotnract la radice di questo Merkle tree.

Assumendo che il giocatore P stia giocando su una board N x N con $N^2$ celle in totale e piazzi k navi sulla board con N come una potenza di 2. Consideriamo una linearizzazione riga per riga delle celle di una matrice bidimensionale. Per ogni cella della board un nodo foglia $L_i$ con $i \in [1, N^2]$ di un Merkle tree viene creato salvando il  valore $v_i=H(s_i||r_i)$, con $s_i$ lo stato dell'i-esima cella della board e $r_i$ in salto random differente per ogni cella. Lo stato della cella può essere 1, denotando la presenza di una nava su quella cella, oppure 0, denotando la cella vuota.

![](/home/francesco/.config/marktext/images/2023-06-17-16-28-26-image.png)

## Fase di lancio dei missili

Supponendo che che il giocatore 1 selezioni nel suo turno le coordinate dove sparare e le invii allo smart contract. Lo smart contract salva le coordinate target per farle leggere al giocatore 2. Il giocatore 2 legge le coordinate e controlla se lo sparo ha colpito o ha mancato. A questo punto i giocatori generano il Merkle proof dimostrando che la sua board segreta soddisfa il risultato affermato e che la loro configurazione del tabellone si allinea con la radice del Merkle tree che è memorizzata nello smart contract. Lo smart contract riceve queste informazioni dal giocatore 2 e esegue il metodo di verifica sulla prova. Se questa ritorna vero salva il risultato del lancio nel suo stato di gioco dove ha salvato tutti i risultati degli spari fatti fin'ora. Il giocatore 1 è in grado di vedere il risultato dei suoi spari dallo smart contract.

### Dichiarazione di un vincitore

I giocatori alternato i turni finché un giocatore affonda tutte le navi dell'avversario. Lo smart contract può facilmente controllare questa condizione di vittoria dopo ogni turno contando il numero totale delle coordinate colpite per ogni giocatore e controllando se questo è uguale al numero di navi di quel giocatore. Quando questo accade il vincitore invia la sua board allo smart contract che controlla che le posizioni delle navi siano valide (le navi non siano intersecate) e poi aggiorna lo stato della board di gioco per mostrare il vincitore e trasferire il prezzo.

### Meccanismo di penalizzazione

Se l'avversario ci mette troppo tempo per fare una mossa ed è il suo turno il giocatore potrebbe accusarlo di essersi allontanato. Potrebbe quindi essere implementato la notifica che si è stati accusati di lasciare. Questo scatenerà un evento che dovrebbe essere gestito dall'avversario entro un limite di tempo di 5 blocchi. Se il tempo passa l'accusante potrebbe ottenere l'intero premio e il gioco è concluso mentre se il giocatore risponde nei 5 blocchi di delay vuol dire che sta ancora giocando.

## Dettagli implementativi

Sviluppare uno smart contract che sia in grado di gestire un insieme di partite simultaneamente. Un utente può creare una nuova partita invocando una funzione dello smart contract che aggiunga la nuova partita alla lista o può unirsi ad una partita preesistente se nessun'altro si è già unito.

Quando un utente crea una partita, lo smart contract ritorna un identificatore unico ID di quella partita.

Ci sono due opzioni per un utente che si unisce ad una partita creata in precedenza:

- La partita viene scelta dallo smart contract in modo randomico;

- Il creatore della partita può condividere il suo ID con un amico che può usarlo per unirsi ad una partita appena creata.

Quando il secondo giocatore si è unito alla partita, lo smart contract emette un evento di avviso al giocatore che il gioco può iniziare. A questo punto le due parti prendono una decisione congiunta sulla quantità di valore da sottomettere al gioco (entrambi contribuiscono con lo stesso valore concordato). Il valore deposistato viene considerato un fattore che contribuisce a far giocare i giocatori secondo le regole. Ogni tentativo di barare, infatti, viene punito con l'accredito del deposito all'avversario.

Lo smart contract salva tutte le informazioni dello stato sul gioco, come l'indirizzo del creatore del gioco, la fase corrente di gioco e la configurazione dell'hash della board sottoposta sulla blockchain.

Il tipo e la misura delle navi deve obbedire ad un insieme predefinito di regole che dipendono dalla grandezza della board N. E' ammissibile rappresentare ogni nave come un rettangolo di larghezza 1 e altezza variabile (1x5,1x4, ecc..) anche se sono possibili configurazioni di navi più complesse.

L'obiettivo principale del codice front-end è la creazione del Merkle proof e l'interazione con lo smart contract. L'implementazione della rappresentazione grafica della board non è obbligatoria. E' possibile sfruttare una rappresentazione della board basata su testo.

## Sottomissione

Il progetto deve essere sviluppato individualmente. Il materiale che deve essere sottoposto per la valutazione è:

- Il progetto che implementa la battaglia navale: smart contract e codice front-end.

- La valutazione dei costi di gas di ogni funzione dello smart contract. Fornire anche una valutazione del costo totale dello smart contract per una partita giocata su una board 8x8 assumendo che ogni giocatore sbagli ogni sparo.

- Un analisi delle potenziali vulnerabilità del contratto.

- Una relazione pdf contenente le pricipali decisioni di implementazione prese, un manuale utente con le istruzioni per configurarlo e provarlo e le istruzioni per eseguire una demo che può essere automatica o manuale.
