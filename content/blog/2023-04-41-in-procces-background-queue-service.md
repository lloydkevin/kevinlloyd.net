---
title: "Efficiently Handling Asynchronous Request-Reply with an In-Memory Queue and MediatR in C#"
date: 2023-04-01T14:44:15-05:00
draft: false

description: "Streamline your C# app's workflow with an in-memory queue using Channels and MediatR. Learn how to handle the Asynchronous Request-Reply pattern efficiently."

images: [/images/posts/in-memory-query-mediatr.jpg]
tags: ["MediatR", "Domain Driven Design", "Architecture"]
---

## What is the Asynchronous Request-Reply Pattern

Over the years I've often needed this pattern, I just didn't know it had a name. Oftentimes, we'd like to kick off long running process from the user interface to your backend server. The problem is that HTTP isn't great at handling long-running processes. Case in point, the default timeout on the `HttpClient` class is 100 seconds.

What I've typically done is simply extend the timeout to something ridiculous to ensure that my process won't time out. It works, but not a great solution. In modern applications, it's increasingly common to perform time-consuming or resource-intensive tasks in the background, without blocking the main thread or user interface.

Enter the Asynchronous Request-Reply pattern. The [Microsoft Article](https://learn.microsoft.com/en-us/azure/architecture/patterns/async-request-reply) explains this with all the specific details. But in a nutshell:

- The client kicks off the long-running process.
- The server kicks off the process *asynchronously* (fire and forget) and immediately returns to the client
    - That "*asynchronously*" is doing a lot of heavy lifting in that statement.
    - Most likely a process or job identifier is returned to the client. Or possibly the location of another endpoint to poll for status.
- The client will then poll the *status* endpoint periodically.
    - I've even seen some fancy implementations where the status message includes an estimated completion time.
- When the status endpoint responds with *completed*, the client can then take the appropriate action.
    - Just display *ok* to the user or go to the destination of the *thing* it was waiting for.
    - Some APIs may respond with the destination of the new resource via the `Location` header.

## How Do I Implement It?

Let's get the naive implementation out of the way:
```csharp {linenos=inline,hl_lines=6}
[HttpPost("/api/longRunning")]
public IActionResult Start()
{
    Task.Run(() => 
    {
        myLongRunningProcessHere();
    });
    return Ok();
}
```
I'm sure, at some point, we've all tried something like this and got burned. But just in case you haven't here's the problem:
`Task.Run()` will run your process asynchronously (kinda), however, as soon as the controller returns a response ASP.NET will dispose that instance of the controller. If your long-running process relies on anything instantiated during that controller action, things will start to fail spectacularly. The errors may look like this: `Error: the object is already disposed`.

Consider the example where data needs to be fetched using Entity Framework (EF) Core. In a web application, EF Core is  usually wired up to the DI container using a `scoped` lifetime. That way, the EF instance (along with the controller instance) is disposed after the HTTP request is completed. If a process is still relying on that instance, bad things happen.

What we need is a dedicated process that runs this outside of the scope of the controller. That typically leads us to a background process backed by a queue. The term _queue_ has a lot of different meanings here. Some great examples are: [RabbitMQ](https://www.rabbitmq.com/), [AWS SQS](https://aws.amazon.com/sqs/), [Azure Storage Queues](https://azure.microsoft.com/en-us/products/storage/queues/), and [Azure Service Bus](https://azure.microsoft.com/en-us/products/service-bus/).

Any of these will fit the scope of the problem, however, they come with their pros and cons.

- They are great for the scalability of your application. It's often trivial to have these scale horizontally to handle more load. Plus the cloud options can be configured.
- They are an excellent option for communication between different systems or services.
- They are reliable and durable. Once your message makes it into the queue, you're pretty much guaranteed it will get delivered (at least once). Even if your services fail or were offline. Once things are back up and running, messages will be consumed.
- Most of them have built-in retry capabilities, if you need it.

However:
- There is a cost to consider. If you're using something on-premises there's labor cost to keep this service up and running. For cloud services, that's something you can look up. However, those costs can be fuzzy, since they tend to grow with your usage.
- The biggest con is usually one of complexity. Things to consider include networking, security, message routing, etc.

Even though these systems _can_ solve our problem, they don't seem very targeted for it.
Caveat:
I will say, if you're maintaining a system that already uses a queue service and there is an established usage pattern for it, I would definitely lean on that to solve this problem.


## In-Process Queue Service
 
 If we don't want to bite off the added complexity of an infrastructure-based queue service, we're left with an in-process queue. This is by no means a silver bullet, but it does fit the Asynchronous Request-Reply Pattern pretty well.

Conceptually, the implementation would look like this:
- A in-memory _queue_ (the data structure [definition](https://en.wikipedia.org/wiki/Queue_(abstract_data_type)))
  - This store handles a FIFO list of _tasks_ or _jobs_.
- A background process that listens for entries into the queue, pops them off and runs the job.

C# has queues (of course). We will actually be using `Channels`, which wrap our queue in a much cleaner and more performant abstraction. You can [read more about channels here](https://devblogs.microsoft.com/dotnet/an-introduction-to-system-threading-channels/).

ASP.NET Core gives us a wonderful implementation for Background Services, using ... well [BackgroundService](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-7.0&tabs=visual-studio#backgroundservice-base-class).

It just so happens the Microsoft documentation has a great example that combines both of these elements to build a [Queue Service](https://learn.microsoft.com/en-us/dotnet/core/extensions/queue-service#create-queuing-services).

The problem with this example is that it lacks some real-world problems. Since the task queue is only storing a list of `Func` it seems you could only perform trivial tasks. It does not account for resolving other dependencies or performing _real_ tasks.

When trying to solve this problem for myself, I poked at it for a while, until I realized what I really needed was a way to _dispatch_ these tasks.

### Enter MediatR
If you're unfamiliar with the [MediatR](https://github.com/jbogard/MediatR) library, here's a good [usage example](https://ardalis.com/using-mediatr-in-aspnet-core-apps/). I won't be able to do it justice in this post.

I often use this library as a way to dispatch [Domain Events](https://www.martinfowler.com/eaaDev/DomainEvent.html) in a lot of my projects. So I leveraged them for this problem. Here's what the modified implementation looks like:

First, we have a `BackgroundTaskQueue`:
```csharp
public interface IBackgroundTaskQueue
{
    Task<INotification> DequeueAsync(CancellationToken stoppingToken);
    Task QueueTaskAsync(INotification task, CancellationToken stoppingToken = default);
}

public class BackgroundTaskQueue : IBackgroundTaskQueue
{
    private readonly Channel<INotification> _queue = Channel.CreateUnbounded<INotification>();

    public async Task QueueTaskAsync(INotification task, CancellationToken stoppingToken = default)
    {
        await _queue.Writer.WriteAsync(task);
    }

    public async Task<INotification> DequeueAsync(CancellationToken stoppingToken)
    {
        return await _queue.Reader.ReadAsync(stoppingToken);
    }
}
```
This class allows our consumers to add tasks to the queue. These _tasks_ are simply instances of `INotification` from MediatR.
Most of this is taken straight from the Microsoft Example.

Then we implement the actual background service:

```csharp {linenos=inline,hl_lines=[32,35,38]}
/// <summary>
/// https://learn.microsoft.com/en-us/dotnet/core/extensions/queue-service
/// Using MediatR to dispatch tasks
/// </summary>
public sealed class QueuedHostedService : BackgroundService
{
    private readonly IBackgroundTaskQueue _queue;
    private readonly ILogger<QueuedHostedService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public QueuedHostedService(ILogger<QueuedHostedService> logger,
        IServiceScopeFactory scopeFactory, IBackgroundTaskQueue queue)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _queue = queue;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation($"{nameof(QueuedHostedService)} is running.");
        return ProcessTaskQueueAsync(stoppingToken);
    }

    private async Task ProcessTaskQueueAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("Waiting for new queue message.");
                var backgroundTask = await _queue.DequeueAsync(stoppingToken);

                using var scope = _scopeFactory.CreateScope();
                var publisher = scope.ServiceProvider.GetRequiredService<IPublisher>();

                _logger.LogInformation("Running task {TaskType}", backgroundTask.GetType());
                await publisher.Publish(backgroundTask, stoppingToken);
                _logger.LogInformation("Completed task {TaskType}", backgroundTask.GetType());
            }
            catch (OperationCanceledException)
            {
                // Prevent throwing if stoppingToken was signaled
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing task work item.");
            }
        }
    }

    public override async Task StopAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation($"{nameof(QueuedHostedService)} is stopping.");
        await base.StopAsync(stoppingToken);
    }
}
```
The great thing about `IBackgroundTaskQueue` using `Channel<T>` under the hood, is that the call the `DequeueTask` on line 32, simply `awaits` until there is something put in the queue. We are not doing long pooling, there's no `Thread.Sleep()` or `await Task.Delay(...)` anywhere here. The instant something is added to the queue, the background service wakes up and starts processing.

On line 35, we're resolving an instance of `IPublisher`, which MediatR uses for publishing notifications. Once a notification is published, any handlers will be automatically resolved by MediatR and they'll run.

In your `Program.cs` we wire these into the service collection as follows:

```csharp
builder.Services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();
builder.Services.AddHostedService<QueuedHostedService>();
```

An example handler:

```csharp
public record MyLongRunningJob(Guid JobId) : INotification;

public class MyLongRunningJobHandler : INotificationHandler<Ping>
{
    private readonly IStatusService _statusService;
    // Can inject any required dependencies here. They will be scoped to this instance.
    // Note they will not have access to HttpContext since this runs in the background.
    public MyLongRunningJobHandler(IStatusService statusService) 
    {
        _statusService = statusService;
    }

    public async Task Handle(MyLongRunningJob notification, CancellationToken cancellationToken)
    {
        _statusService.SetStatus(notification.JobId, "Running");
        Debug.WriteLine($"Running job: {notification.JobId}");
        await myLongRunningProcessHere();
        _statusService.SetStatus(notification.JobId, "Done");
    }
}
```

Now to refactor your controller method from above:

```csharp {linenos=inline}
[HttpPost("/api/longRunning")]
public Task<IActionResult> Start()
{
    var jobId = Guid.NewGuid();
    await _backgroundTaskQueue.QueueTaskAsync(new MyLongRunningJob(jobId));
    return Ok(jobId);
}

[HttpGet(/api/longRunning/status/{id:guid})]
public IActionResult GetStatus(Guid id)
{
    var status = _statusService.GetStatus(id);
    return Ok(status);
}
```

And there you have it.

## Conclusion
The Asynchronous Request-Reply (ARR) pattern can be challenging to implement without over-engineering and over-complicating. External, distributed queue mechanisms aren't always needed. An efficient and cost-effective solution can be whipped up using very few dependencies. In the project I was working on, we already included MediatR, so it was a win-win. Not only can we solve the ARR issue, but we now have a framework for queuing other background tasks:
- In a system that implements DDD with Domain Events, some domain event handlers could queue their own background tasks. One example would be to a domain event handlers for updates to `Product`. This could queue a task to generate a materialized view for use in the read model or projection for `Product`. It could be a denormalized version called `ProductSummary` that includes, `NumberOfReviews`, `AverageReviewRating`, `NumberOfPurchases`, etc.
- Background thumbnail generation when an image is uploaded.
- Triggering background rebuilding of some large cache.

This solution also lays a great foundation for extension in the future, if your needs change.
- `IBackgroundTaskQueue` could be extended to persist the tasks when queued. That way, the queue can be recovered from storage in the event of an application failure.
- `IBackgroundTaskQueue` could even delegate to an actual distributed queue service.

As with all cases of extension, be careful that you're not reinventing the wheel. If the problem set changes drastically, it might be time to reevaluate from the start.

Now I'd be doing a disservice if I didn't mention [Hangfire](https://www.hangfire.io/) as an option here. However, for my needs, it was a bit overkill. But it's also a decent candidate for assisting with AAR.

Do let me know if you have found other interesting uses for an in-process queue.