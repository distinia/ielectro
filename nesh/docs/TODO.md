Sto sviluppando un framework PHP chiamato Nesh.
Ho una classe Fixuse che scansiona il framework e aggiunge automaticamente i "use" mancanti.
Attualmente funziona così:
1. Scansiona tutti i file PHP in /src.
2. Costruisce una mappa:
   Query => Nesh\Database\Query
   Cookie => Nesh\Http\Cookie
   ecc.
3. Per ogni file aggiunge automaticamente i "use" mancanti.
Ora voglio eliminare completamente l'uso di preg_match() e preg_replace().
Voglio una soluzione basata ESCLUSIVAMENTE su token_get_all().
Requisiti:
- Non usare regex per trovare o modificare le classi.
- Analizzare i token del file.
- Riconoscere tutti gli utilizzi di classi:
    - new Foo()
    - Foo::method()
    - extends Foo
    - implements Foo
    - catch (Foo $e)
    - instanceof Foo
    - type hint dei parametri
    - type hint delle proprietà
    - return type
    - union/intersection types
- Costruire la lista delle classi realmente utilizzate.
Per ogni classe usata:
- Se appartiene al namespace Nesh (presente nella mappa costruita in precedenza):
    - aggiungere automaticamente il relativo "use" se manca.
- Se NON appartiene al framework:
    - NON aggiungere alcun use.
    - Se non è già qualificata (es. \Exception o Foo\Bar),
      anteporre automaticamente "\" direttamente nel token.
Non modificare:
- stringhe
- commenti
- variabili
- costanti
- namespace
- nomi di funzioni
La modifica deve avvenire direttamente sui token e poi ricostruire il file.
Non usare regex.
Non usare librerie esterne.
Non usare nikic/php-parser.
Solo token_get_all().
Se necessario puoi riscrivere completamente la classe Fixuse per ottenere un codice più pulito.