# SecurityToolsThatCriedWolf

## MongoDB CVE database

The Electron vulnerability screen uses a local, authenticated MongoDB container.
From the repository root:

```powershell
docker compose up -d
```

On the first startup, Docker creates the `onionmanager-mongo-data` volume and
runs `database/init/01-seed-cves.js`, which inserts three sample CVE records.
Initialization scripts only run when the database is new. To completely reset
the database and run the initializer again:

```powershell
docker compose down -v
docker compose up -d
```

To import a larger layer-mapped set from the NVD API, run this from `frontend`:
```powershell
npm install
npm run seed:cves
```

To remove all CVE records while keeping the MongoDB container and volume, log
in to MongoDB and run `deleteMany`:

```powershell
docker compose exec mongodb mongosh --username onionadmin --password change-this-password --authenticationDatabase admin onionmanager --eval "db.cves.deleteMany({})"
```

To remove only the local sample records:

```powershell
docker compose exec mongodb mongosh --username onionadmin --password change-this-password --authenticationDatabase admin onionmanager --eval "db.cves.deleteMany({ source: 'local sample' })"
```

The application does not have a separate login screen. Its Electron process
connects using `MONGODB_URI` or the local development defaults. To log in
manually and view the database, use `mongosh`:

```powershell
docker compose exec mongodb mongosh --username onionadmin --password change-this-password --authenticationDatabase admin onionmanager
db.cves.find().pretty()
db.cves.countDocuments()
exit
```

MongoDB Compass can use the same credentials with connection string
`mongodb://onionadmin:change-this-password@127.0.0.1:27017/?authSource=admin`.
Open the `onionmanager` database and `cves` collection to view the records.
After selecting **Get OnionS**, the app compares the collected hardware,
firmware, OS, library, and application information against the database and
displays possible matches. Matches are indicators for review, not confirmed
vulnerabilities.

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