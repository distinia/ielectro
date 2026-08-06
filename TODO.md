Ecco una versione più chiara e precisa per Cursor AI:

---

Vorrei fare un refactor importante di **Nesh** per renderlo realmente scalabile.

## 1. Connection

Attualmente `Connection` è legato ad un solo database.

Questo approccio non va bene perché in futuro iElectro sarà composto da molte applicazioni (`account`, `admin`, `dyscover`, ecc.) e **ogni applicazione avrà il proprio database**.

Per questo motivo `Connection` **non deve più avere un database fisso**.

Il nome del database deve essere passato come parametro, ad esempio:

oppure con un metodo equivalente che ritieni più pulito.

L'obiettivo è che qualsiasi query possa scegliere il database corretto senza dipendere da una configurazione globale.

---

## 2. App

Anche `Nesh\App` deve essere reso più flessibile.

Attualmente molti valori vengono ricavati automaticamente, ma in futuro potrebbero essere diversi.

Vorrei quindi poter istanziare un'applicazione in questo modo:

```php
new App(
    'iElectro Account', // name
    'account',          // subdomain
    'account',          // folder
    'ielectro_account', // database
    '1.0.0'             // version
);
```

Ogni parametro deve essere salvato e reso disponibile all'applicazione.

Ad esempio:

* name
* subdomain
* folder
* database
* version

Non assumere più che questi valori coincidano tra loro.

> **Nota:** attualmente tutti i progetti sono ancora alla versione **1.0.0**.

---

## 3. Database bootstrap

Quando viene inizializzata l'applicazione:

1. Controlla se il database esiste.
2. Se non esiste, crealo.
3. Se il database esiste ma è completamente vuoto (nessuna tabella), esegui automaticamente tutti gli script SQL presenti nella cartella:

```
/database
```

4. Se invece il database contiene già delle tabelle, **non eseguire nulla**.

In pratica il bootstrap del database deve avvenire automaticamente solo al primo avvio.

---

## 4. Compatibilità

Durante il refactor:

* aggiorna tutte le classi che utilizzano `Connection`;
* aggiorna le query affinché utilizzino il nuovo sistema;
* mantieni lo stile e l'architettura già utilizzati in Nesh;
* non aggiungere codice legacy o duplicato;
* se è necessario modificare altre classi per supportare questa nuova architettura, fallo mantenendo il codice il più pulito possibile.
* aggiorna i bootstrap.php delle app
