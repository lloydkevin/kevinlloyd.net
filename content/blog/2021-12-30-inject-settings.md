---
title: "Dependency Injection of AppSettings in ASP.NET Core"
description: "Use Dependency Injection for Application Settings. This can be appSettings.json in ASP.NET Core or web.config settings in .NET Framework 4.X."
date: "2021-12-30T08:00:00-06:00"
images: [/images/posts/inject-settings.jpg]
tags: ["Dependency Injection", "Testing"]
draft: false
---
When talking about the [Dependency Inversion Principle](https://stackify.com/dependency-inversion-principle/), the `D` in [SOLID](https://simple.wikipedia.org/wiki/SOLID_(object-oriented_design)), we have a pretty good idea what dependencies we're trying to abstract away. `OrderRepository` or `SendGridEmailClient` are easy examples of implementations we should abstract away. It also overlaps well with the Single Responsibility Principle, since data access for orders and sending emails are separated from the business logic where they are used. The C# implementation of this would involve making these classes implement the appropriate interfaces, e.g. `IOrderRepository` and `IEmailSender`.

With those examples, dependencies seem easy to identify: service from another module in your code, data access libraries like repositories, external or 3rd party services like HTTP clients or something sending email. One dependency I hadn't given much thought to is the settings the application relies on.

In .NET Framework, these are stored in the `web.config` file and are accessed with `ConfigurationManager`. In .NET Core, these have moved to (the much more flexible) `appsettings.json` files and are accessed using `IConfiguration`.

## So What's the Problem?
It's not so much a problem as much as it is an opportunity for improvement. When testing, it's easy enough to add an `app.config` or `appsettings.json` file specific to the test project. That has worked for me just fine for years. One issue I've run into is the difficulty of changing settings for a specific test. Yes, you could change the settings before the test run and reset it after, but consider this:

```csharp {linenos=inline}
public class OrdersController
{
    public bool Delete(long id)
    {
        var order = _db.Orders.Find(id);
        if (bool.Convert(ConfigurationManager.AppSettings["IsSoftDelete"]))
        {
            order.IsDeleted = true;
        }
        else
        {
            _db.Orders.Remove(order);
        }
        _db.SaveChanges();
    }
}
```
Line 6 is our decision point to decide whether we do a *soft delete* or a *hard delete* of an order.
Testing this isn't impossible, you could `ConfigurationManager.AppSettings["IsSoftDelete"] = 'True/False'` before the test and rest it after. The casting the string to a boolean is a bit awkward here. But, for me, it's mainly the possible repetition of the *magic string* `IsSoftDelete`. Both of these things can be error prone.

Now the alternative:

```csharp {linenos=inline}
public class OrdersController
{
    private readonly Settings _settings;

    public OrdersController(Settings settings) => _settings = settings;

    public bool Delete(long id)
    {
        var order = _db.Orders.Find(id);
        if (_settings.IsSoftDelete)
        {
            order.IsDeleted = true;
        }
        else
        {
            _db.Orders.Remove(order);
        }
        _db.SaveChanges();
    }
}
```
Notice we are injecting the `Settings` class in through the constructor. This is a class that could represent the  full structure of the application settings. This is better for a number of reasons.

- A concrete POCO (plain old C# object) is refactoring friendly. You can rename fields and be sure they are consistent everywhere in the application.
- Compiler assistance against typos. 
- Intellisense/autocomplete in any decent IDE. This can help with auto discovery of other settings.
- Elimination of *magic strings*

Testing becomes easier and more explicit. We can specifically inject a test instance of the settings class with the values you care about. Because `Settings` is just a POCO, it's trivial to new up and pass to the class you're testing.

Of course, we have to map the do this mapping of the `Settings` class to the file settings, through `ConfigurationManager` somewhere. This would usually be done in some bootstrap code somewhere and registered using your IoC (Inversion of Control) container.

## The Implementation

### .NET Framework

The mapping code:

```c#
var settings = new Settings
{
    IsSoftDelete = bool.Convert(ConfigurationManager.AppSettings["IsSoftDelete"]),
    ApiKey = ConfigurationManager.AppSettings["MyAPIKey"],
    ...
};
kernel.Bind(settings); // using Ninject to bind to this specific instance of the class
```

In this example, we're essentially registering this as a singleton. For most of my implementations, settings don't change after the application starts up. Even though the `web.config` file can be changed, it triggers a reload of the running application anyway.

If you're running a console application or a Windows Service, your registration may look different.



### .NET Core

The `appSettings.json` file in .NET Core is much more flexible than `AppSettings` in `web.config`. You can have more complex objects, with sub classes, and even collections. The process is similar:

- Define a POCO that maps to your settings file.
- Map the settings from the file to the class
- Register these into your IoC container.

This is almost trivial in .NET Core using the [Options Pattern](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options?view=aspnetcore-6.0). 

Consider these extension methods:

```c#
public static IServiceCollection ConfigureSettings(this IServiceCollection services, IConfiguration configuration) where T : class, new()
{
    services.Configure<Settings>(configuration); // configure the whole settings file
    // OR
    services.Configure<Settings>(configuration.GetSection("Settings")); // bind to a specific section of the settings file.
    return services;
}
```

 Configuring the settings like this will register the class using the `IOptions` interface. Settings can be accessed as follows:

```c#
public class MyService
{
    private readonly Settings _settings;
    
    public MyService(IOptions<Settings> options)
    {
        _settings = options.Value;
    }
}
```

This works great, but I prefer to the one additional step:

```c#
 services.AddSingleton(x => x.GetService<IOptions<Settings>>().Value);
```

This way I skip having to tie myself to the `IOptions` interface (which is just another abstraction I don't need). Using this becomes exactly the same as the .NET Framework example:

```c#
public class MyService
{
    private readonly Settings _settings;
    
    public MyService(Settings settings)
    {
        _settings = settings;
    }
}
```

Another alternative to registering is to totally skip the Options Pattern:

```c#
var settings = configuration.Get<Settings>(); // to bind the whole file
// OR
var settings = configuration.GetSection("Settings").Get<Settings>(); // to bind to a section of the file

services.AddSingleton(settings); // register this instance.
```

I find this a more straight forward implementation, if I don't need the added benefits of `IOptions`.

### Reusability

```c#
public static IServiceCollection BindSettings<T>(this IServiceCollection services, IConfiguration configuration, string section = null) where T : class, new()
{
    T settings;
    if (section == null)
    {
        settings = configuration.Get<T>();
    }
    else
    {
        settings = configuration.GetSection(section).Get<T>();
    }
    services.AddSingleton(settings);
    return services;
}
```

This extension method will allow easy registration of settings.

### References

- [Easy Configuration Binding in ASP.NET Core - revisited](https://weblog.west-wind.com/posts/2017/Dec/12/Easy-Configuration-Binding-in-ASPNET-Core-revisited)
- [Options Pattern In .NET – IOptions, IOptionsSnapshot, IOptionsMonitor](https://thecodeblogger.com/2021/04/21/options-pattern-in-net-ioptions-ioptionssnapshot-ioptionsmonitor/)