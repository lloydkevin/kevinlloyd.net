---
title: "2019-12-19-Asp-Net-Core-Options-Pattern"
description: ""
date: "2019-12-18T21:54:37-06:00"
thumbnail: ""
categories:
  - "asp"
tags:
  - "asp.net"
  - ".net core"
draft: true
---
Dependency injection in ASP.NET Core is a wonderful thing.

Options Pattern:

https://weblog.west-wind.com/posts/2017/dec/12/easy-configuration-binding-in-aspnet-core-revisited

https://themusingsofadev.com/how-to-use-the-ioptions-patterns-in-an-azure-function-app

https://themusingsofadev.com/how-to-use-the-ioptions-patterns-in-an-azure-function-app

https://thecodeblogger.com/2021/04/21/options-pattern-in-net-ioptions-ioptionssnapshot-ioptionsmonitor/


public static IServiceCollection ConfigureOptions<T>(this IServiceCollection services, IConfiguration configuration) where T : class, new()
        {
            services.Configure<T>(configuration);
            services.AddTransient(x => x.GetService<IOptions<T>>().Value);
            return services;
        }


   public static T GetAndConfigureOptions<T>(this IServiceCollection services, IConfiguration configuration) where T : class, new()
        {
            ConfigureOptions<T>(services, configuration);
            return configuration.Get<T>();
        }


```
services.AddTransient(sp => sp.GetService<IOptions<AppSettings>>().Value);
```