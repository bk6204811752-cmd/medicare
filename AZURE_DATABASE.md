# Azure Database Setup

This app is Prisma-backed. Local development uses `prisma/schema.prisma` with SQLite, while Azure uses `prisma/schema.azure.prisma` with Azure SQL Database.

## Your Azure SQL Database

```text
Server: basant-server.database.windows.net
Database: myfree-db
Authentication: Active Directory Default / DefaultAzureCredential
```

Set these values in `.env` or in your Azure App Service configuration:

```env
DATABASE_PROVIDER="sqlserver"
AZURE_SQL_SERVER="basant-server.database.windows.net"
AZURE_SQL_DATABASE="myfree-db"
AZURE_DATABASE_URL="sqlserver://basant-server.database.windows.net:1433;database=myfree-db;encrypt=true;trustServerCertificate=false;connectionTimeout=30;authentication=DefaultAzureCredential"
```

`authentication=DefaultAzureCredential` is the Prisma adapter equivalent of the Azure portal string `Authentication="Active Directory Default"`.

## Generate For Azure SQL

Prisma Client must be generated from the Azure SQL schema before running the app against Azure SQL:

```bash
npm run db:azure:generate
```

For local SQLite development, switch back with:

```bash
npm run db:generate
```

## Initialize Azure Schema

The Azure setup command uses the `mssql` driver with Active Directory Default authentication, creates the Prisma SQL Server schema, generates the Azure Prisma Client, and seeds the demo data:

```bash
npm run db:azure:setup
```

If the command reports a DefaultAzureCredential authentication error, sign in with a supported Azure credential on the machine first. Common local options are Azure CLI login, Visual Studio / VS Code Azure login, or an Azure App Service managed identity in production.

After Azure setup, keep `DATABASE_PROVIDER="sqlserver"` when you want the app to use Azure SQL. Use `DATABASE_PROVIDER="sqlite"` and `npm run db:generate` for local SQLite development.

## Local Development

```bash
npm run db:reset
npm run dev
```

Default logins after seeding:

```text
admin@medcare.local / Admin@12345
owner@sharmamedical.local / Shop@12345
```
