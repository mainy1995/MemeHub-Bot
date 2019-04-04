
Verhor nodejs und mysql installieren
datenbank einrichten mit den 2 tabellen im sql ordner und benutzer anlegen
dann in den ordner und npm install und dann könnt ihr mit dem npm run start den bot starten

zum testen erstellt euch einfach nen eigenen bot bei @botfather auf telegram dann bekommt ihr nen bottoken um euch mit ihm zu verbinden.

dann müsst ihr noch die gruppen id auf eine gruppe ändern die ihr zum testen benutzt. dazu einfach den bot in ne gruppe einfügen und starten, dann in der gruppe /start und ihr könnt in der konsole die id auslesen.

als umgebung nutze ich ms visual studio code

## Usage

```sh
$ npm install
$ BOT_TOKEN='123:......' MYSQL_HOST='...' MYSQL_PASSWORD='...' npm run start
```

Frameworks:
Telegraf:   https://telegraf.js.org/#/?id=telegraf-js
μ-bot:      https://github.com/telegraf/micro-bot

Datenbank:  mySQL
