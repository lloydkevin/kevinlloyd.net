---
title: "Entity Framework, Azure SQL, DateTime.Now, and Time Zones"
date: 2022-01-25T20:35:13-06:00
draft: false

description: "Take care when using Entity Framework with your (Azure) SQL database in different time zones."
images: [/images/posts/entity-framework-azure-sql-timezone.jpg]
tags: ["Entity Framework", "Azure", "Micro Post"]
---

## The Problem

Imagine one day you wake up to reports from customers saying that their trial accounts have expired too early. How much earlier? About six (6) hours. First of all, you ask yourself why would they wait till the last few hours of a 30-day trial, but I digress.

You load up your developer environment and get to work.

## The Set-Up

You're using Entity Framework to get all the *expired* accounts from your Azure SQL Server database so that you can deactivate them (made up scenario, but bear with me):

```csharp
var expiredAccounts = _db.Accounts.Where(x => x.ExpirationDate > DateTime.Now).ToList();
expiredAccounts.ForEach(x => x.IsActive = false);
_db.SaveChanges();
```

It's one simple query, nothing complicated. You look at it for 15 minutes and nothing jumps out at you. You stage some data in development and run things in debug and it works perfectly. Also, all the integration tests are passing. So what's the problem?

You even profile the SQL (a habit you should pull out of the toolbox every now and then):

```sql
select * from dbo.Accounts where ExpirationDate > GETDATE()
```

That seems right, so what's the issue here?

## The Reason

After banging your head against the wall for a few hours you stumble onto this blog post. You also remember having all sorts of timezone issues where you just pushed this application to Azure. So you check that the timezone on the Azure App Service is configured to run in the Central time zone. It is set correctly; the `WEBSITE_TIME_ZONE` setting is set to `US Central Standard Time`.

Then you remember that there is no way to set the timezone on the Azure SQL Instance and all becomes clear. `GETDATE()` will utilize the timezone associated with the SQL Server location. Since there's no way to set this in Azure SQL, it's not using your expired time of 10:00 AM. Instead, all the expiration dates are using 4:00 PM (6 hours later).

What's happening is the SQL Server Database Provider is being very *smart*. It sees a time of `DateTime.Now` and it's *smart enough* to know the equivalent SQL version is `GETDATE()`. Since `DateTime.Now` is evaluated on the Application Server (Central Time) and `GETDATE` on the SQL Server (UTC); all sorts of havoc will be in store.

## The Fix

So how do we fix this? In this particular case, we can apply a very simple tweak to the LINQ query:

```csharp
var now = DateTime.Now;
var expiredAccounts = _db.Accounts.Where(x => x.ExpirationDate > now).ToList();
expiredAccounts.ForEach(x => x.IsActive = false);
_db.SaveChanges();
```

We grab `DateTime.Now` into a local variable, then pass it into the LINQ Query. This produces SQL equivalent to:

```sql
select * from dbo.Accounts where ExpirationDate > '2022-01-25 10:00'
```

Now all is right with your query and the appropriate accounts will get disabled.

This problem was made more obvious because Azure SQL databases don't allow you to change the timezone. However, it is not isolated to Azure SQL. This would be an issue anytime your application server is in a different location than your database server (e.g. in a load balanced failover situation).

### The Better Fix

Use [DateTimeOffset](https://ardalis.com/why-use-datetimeoffset/). If you're using and storing DateTimeOffset in your application, even a SQL comparison using `GETDATE()` or `SYSDATETIME()` will be evaluated correctly since all the timezone information would be baked into the data.

That way it won't matter where your SQL Server or Application Server are running.

## References:

- [EF Core SQL Server uses GETDATE() in place of C# DateTime.Now](https://stackoverflow.com/questions/56227514/ef-core-sql-server-uses-getdate-in-place-of-c-sharp-datetime-now)
- [Lesson Learned #4: Modifying the default time zone for your local time zone](https://techcommunity.microsoft.com/t5/azure-database-support-blog/lesson-learned-4-modifying-the-default-time-zone-for-your-local/ba-p/368798)