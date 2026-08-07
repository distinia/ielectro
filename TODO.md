COSA DA FARE:
1. la logica di App va bene, in quanto Database, Pages e Api, sono associate a un App, però se noti cose da correggile correggile
2. poi nei bootstrap, le $app vanno dichiarate come globali univoci, con nomi unici preferibilmente associati al nome del app. esempio si chiama l'app iElectro Dominions diventa $iElectroDominions 
3. io il new App li farei dentro il autoload, ed eliminerei completamente i bootstrap nei vari /public/ delle applicazioni, in quanto non serve
4. nel router.php delle app li metti le publicApi