# SQL Compare Tool

Create backup sql dump file

```bash
/usr/local/mysql/bin/mysqldump -u root -p --no-create-db --no-create-info --complete-insert --compact --all-databases > backup.sql
```

Create current sql dump file

```bash
/usr/local/mysql/bin/mysqldump -u root -p --no-create-db --no-create-info --complete-insert --compact --all-databases > current.sql
```

Run script for results.txt

```bash
node compare.js
```