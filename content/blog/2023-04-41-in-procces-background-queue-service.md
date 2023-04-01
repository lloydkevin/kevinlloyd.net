---
title: "Efficiently Handling Asynchronous Request-Reply with an In-Memory Queue and MediatR in C#"
date: 2023-04-01T14:44:15-05:00
draft: false

description: "Streamline your C# app's workflow with an in-memory queue using Channels and MediatR. Learn how to handle the Asynchronous Request-Reply pattern efficiently."

images: [/images/posts/2023-04-41-in-proces-background-queue-service.jpg]
tags: ["", "Micro Post"]
---

## What is the Asynchronous Request-Reply Pattern

Over the years I've often had a need for this pattern, I just didn't know it had a name. Often times, we'd like to kick off long running process from the user interface to your backend server. The problem is that HTTP isn't great at handling long running processes. Case in point, the default timeout on the `HttpClient` class is 100 seconds.

What I've typically done is simply extend the timeout to something ridiculous to ensure that my process won't timeout. It works, but not a great solution. In modern applications, it's increasingly common to perform time-consuming or resource-intensive tasks in the background, without blocking the main thread or user interface.

Enter the Asynchronous Request-Reply pattern:

 [![Asynchronous Request-Reply Pattern - From Microsoft Learning](/images/posts/async-request.png)](https://learn.microsoft.com/en-us/azure/architecture/patterns/async-request-reply)

The [Microsoft Article](https://learn.microsoft.com/en-us/azure/architecture/patterns/async-request-reply) explains this with all the specific details. But in a nutshell:

- The client kicks off the the long running process.
- The server kicks of the process *asynchronously* (fire and forget) and immediately returns to the the client
    - That "*asychronously*" is doing a lot of heavy lifting in that statement.
    - Most likely a process or job identifier is returned. Or possibly the location of anonther endpoint to poll for status.
- The client will then poll the *status* endpoint periodically.
    - I've even seen some fancy implementaiton where the status message includes an estimated completion time.
- When the status endpoint responds with *completed*. The client can then take the appropriate action.
    - Just display *ok* to the user or go to the destination of the *thing* it was waiting for.
    - Again, some implementations handle this with HTTP 302 redirects.

## How Do I Implement It?

First off, we shouldn't confuse and asynchronous process with the .NET [`async await`](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios) concept.

Let's get the naive implementation out of the way:
```csharp {linenos=inline,hl_lines=6}
[HttpPost("/api/longRunning")]
public IActionResult()
{
    Task.Run(() => 
    {
        myLongRunningProcessHere();
    });
    return Ok();
}
```
I'm sure, at some point, we've all tried something like this and got burned. But just in case you haven't here's the problem:
`Task.Run()` will run your process asynchronously (kinda), however as soon as the controller returns a response ASP.NET will dispose that instance of the controller. If your long running process relies on anything instantiated during that controller again, things will start to fail in spectacular fashion. The errors may look like this: `Error: the object is already disposed`.

What we need is a dedicated process that runs this outside of the scope of the controller. That typically leads us to a background process backed by a queue. The term _queue_ have a lot of different meanings here. Some great examples are: [RabbitMQ](https://www.rabbitmq.com/), [AWS SQS](https://aws.amazon.com/sqs/), [Azure Storage Queues](https://azure.microsoft.com/en-us/products/storage/queues/), and [Azure Service Bus](https://azure.microsoft.com/en-us/products/service-bus/).

Any of these will fit the scope of the problem, however they come with their own pros and cons.

- They are great for scalability of your application. It's often trivial to have these scale horizontally to handle more load. Plus the cloud options can be configured.
- They are an excellent option for communication between different systems or services.
- They are reliable and durable. Once your message makes it into the queue, you're pretty much guaranteed it will get delivered (at least once). Even if your services fail or were offline. Once things are back up and running, messages will be consumed.
- Most of them have built in retry capabilities, if you need it.

However:
- There is a cost to consider. If you're using something on premises there's labor cost to keep this service up and running. For cloud services, that's something you can lookup. However, those costs can be fuzzy, since they tend to grow with your usage.
- The biggest con is usually one of complexity. Things to consider include: networking, security, message routing, etc.

Even though these systems _can_ solve our problem, they don't seem very targeted for it.
Caveat:
I will say, if you're maintaining a system that already uses a queue service and there is an established usage pattern for it, I would definitely lean on that to solve this problem.


## In Process Queue
 
 If we don't want to bite off the added complexity of a queue service, we're left with an in-process queue. This is by no means a silver bullet, but it does fit the Asynchronous Request-Reply Pattern pretty well.




### 



## Coding Options

For whatever reason, HangFire doesn't fit.



## Background queue implementation

To implement an in-process background  queue, you will need to use the Channels library. Channels provides a  way to create and manage queues of messages. You can then use the  MediatR library to send messages to the queue. MediatR is a dependency  injection framework for .NET that provides a way to decouple your code  into separate concerns.



## Conclusion

- Conclusion: Using an in-process background queue can provide a number of benefits, including:
    - Increased performance: By deferring work to be done later, you can  free up the current thread to do other things. This can improve the  performance of your application.
    - Improved scalability: By using a background queue, you can scale  your application more easily. You can add more workers to the queue to  handle more work.
    - Improved reliability: By decoupling your code, you can make your  application more reliable. If one part of your application fails, the  other parts of your application can continue to run.







III. MediatR for Message Processing

- Introduce MediatR, a library for implementing Mediator pattern in C#
- Explain how MediatR can be used for message processing in the background
- Demonstrate how to use MediatR to process messages from a channel

IV. Building the Background Queue

- Explain how to combine channels and MediatR to build an in-process background queue
- Provide a step-by-step guide for building the queue, including creating a channel, registering MediatR handlers, and processing messages in the background

V. Conclusion

- Summarize the key points covered in the post
- Highlight the benefits of using an in-process background queue in modern applications
- Encourage readers to try building their own in-process background queue using Channels and MediatR







GPT intro

In modern applications, it's increasingly common to perform time-consuming or resource-intensive tasks in the background, without blocking the main thread or user interface. One popular approach to background processing is the Asynchronous Request-Reply pattern, which allows an application to send a request to a background process, receive a response, and continue executing other tasks in the meantime.

In this blog post, we'll demonstrate how to build an in-process background queue using Channels and MediatR in C#, specifically to solve the problem of implementing the Asynchronous Request-Reply pattern. We'll walk you through the process of creating a channel for background processing, using MediatR to handle messages, and ultimately building a robust background queue that can handle multiple requests and responses simultaneously. Whether you're working on a web application, desktop application, or other type of software, mastering the art of background processing is an essential skill for any developer. So, let's dive in!