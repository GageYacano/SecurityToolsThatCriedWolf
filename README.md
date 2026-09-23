# SecurityToolsThatCriedWolf

## MongoDB CVE database

The Electron vulnerability screen uses a local, authenticated MongoDB container.
From the repository root:

```powershell
docker compose up -d
```

The first startup seeds `database/init/01-seed-cves.js` with sample records.
Import a larger layer-mapped set from the NVD API with `npm run seed:cves` from
the `frontend` directory. After selecting **Get OnionS**, the app compares the
collected hardware, firmware, OS, library, and application information against
the database and displays possible matches. Matches are indicators for review,
not confirmed vulnerabilities.

Set `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, or `MONGODB_URI` in the
environment before starting the app when using credentials other than the local
development defaults. The MongoDB port is bound to `127.0.0.1` only.

To inspect the database, use `mongosh` or MongoDB Compass. To share the database
contents, create a portable archive from the named volume:

```powershell
docker compose exec mongodb mongodump --username onionadmin --password change-this-password --authenticationDatabase admin --db onionmanager --archive=/tmp/onionmanager.archive
docker cp onionmanager-mongodb:/tmp/onionmanager.archive .\onionmanager.archive
```

On another machine, restore the archive after starting the container with the
same Compose file:

```powershell
docker cp .\onionmanager.archive onionmanager-mongodb:/tmp/onionmanager.archive
docker compose exec mongodb mongorestore --username onionadmin --password change-this-password --authenticationDatabase admin --archive=/tmp/onionmanager.archive --drop
```

For production or shared use, replace the development password through an
`.env` file that is not committed and do not publish MongoDB beyond localhost
unless network access is explicitly secured.