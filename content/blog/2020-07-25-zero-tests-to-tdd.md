---
title: "Zero Tests to TDD - What I've Learned"
description: "A Journey from zero tests to on the way to Test Driven Development and what I've learned along the way."
date: "2020-07-26T16:00:00-05:00"
# image: images/posts/zero-test-tdd.jpg
images: [images/posts/zero-test-tdd.jpg]
categories: [Blog]
tags: [Testing, TDD, Entity Framework]
---

## A Little Background

I'm usually a stickler for *best practices*, but automated testing is something that has eluded me in my professional career for a long time. I typically work on legacy, line of business applications. So automated testing was never a priority.

I've tried and failed to introduce various development teams to automated testing. Legacy applications are inherently difficult to test. Most everything I've read about automated testing points to trivial examples of testing and something like `add (1, 2)` and making sure the output was `3`. Or testing some new, shiny, beautifully designed application that follows all the SOLID principles. These sample apps are also very trivial.

## A Step in the right direction

No one gave me any insight on how to test a 10-year-old, C# application with mountains of technical debt. Dependencies intermixed all over, very tight coupling, methods that are hundreds of lines long; it was very overwhelming. I didn't really have a good plan until [Working Effectively with Legacy Code](https://www.amazon.com/dp/0131177052/ref=cm_sw_em_r_mt_dp_U_C0phFb3232NAB). Michael Feathers describes legacy code as any code without tests. He goes through steps on how to refactor code to add tests. He explains the concept of *exploratory tests*, what their purpose is, and how best to use them.

The book was a great read, in theory. Some aspects did apply and I was able to get some things under test. But a very small percentage of the code. Also, every test started out with a huge refactor. Although this was a step in the right direction, I still struggled.

## Things I Struggle With

### What to *Unit Test*

We all know about the ideal test pyramid. Tons of fast running, unit tests at the bottom, some integration tests, and in the middle and a handful of end to end tests in at the top. We should favor unit tests because they test things in isolation, they run quickly, and they give quick feedback. All of this sounded awesome until I dove into our codebase looking for candidates to test.

In the line of business application, there was seldom nice, isolated logic that takes some input makes some decisions and returns output that you can validate. 90% of the application flows like this:

#### Reads

```csharp
public OrderViewDTO GetOrder(long id)
{
    var order = ...
    /*look up and order from the database or repository.
    There would be some sort of query using SQL or an ORM if I'm lucky
    Possibly some access control.*/

   var otherstuff = ..
   /* Pull supplementary information needed to be displayed.
   Some summary info, customer details, etc.*/
   return BuildOrderView(order, otherstuff);
}
```

There's no *unit* here for me to test. We're just pulling a bunch of data and packaging it up to display to the user.

#### Writes

```csharp
public void InvoiceCustomer(InvoiceRequest request)
{
    // fetch some data
    var customer = GetCustomer(request.customerId);

    // perform some scattered validation
    if (HasOpenInvoice(request))
        throw new InvalidOperationException("Can only have one open invoice");
    if (!CustomerHasTheFunds(request)) // contacts a payment gateway just for fun.
        throw new InvalidOperationException("Insufficient funds");

    // large private untestable methods with business logic, data fetches with ORMs
    var invoice = CreateInvoice(request);

   	// line item logic wasn't ported yet, so it's in a stored procedure
    CreateLineItems(invoice);
    SaveInvoice(invoice);
}
```

Now the business has told us that invoicing customers is critical functionality, so it should be high on our list of candidates for testing, however...I mean just look at it. You have large, legacy methods that you're not really sure how they work in every scenario, but they work. It's terrifying to think about refactoring this just to start testing.

It's very difficult to think about best practices in a codebase that looks like this. How do I get my perfect Test Pyramid? How do break out dependencies so that the business logic is in one place I can test?

It took me a long while to get to this point, but I've realized something is better than nothing. Technically, it's the first step to  Michael Feathers' philosophy of [exploratory tests](https://en.wikipedia.org/wiki/Exploratory_testing). Get some tests, any tests, in place first, so that you can have greater confidence when you refactor. It was a post from [Jimmy Bogard](https://jimmybogard.com/) (creator of the [AutoMapper](https://automapper.org/) library) that gave me this epiphany. He's advocating for [testing straight to the database](https://jimmybogard.com/avoid-in-memory-databases-for-tests/) with integration tests.

## Lessons Learned

### Give Up On Best Practices - Start Somewhere!

Something's better than nothing. So initially, I'm starting with integration tests. Sue me! The goal here is not letting *best* be the enemy of *better*. When most of your *logic* consists of:

1. Entity Framework or Repository queries that get translated to SQL
2. EF mappings and Includes
3. Database Constraints
4. Overly complicated AutoMapper mappings

Those better be the things you're testing (at least initially).

I've spent years mocking `DbContext` and `IDbSet` or mocking out our repository methods to return fake data. Only to find out that the data wasn't set up right, because if it had come from the database several other entities would have been lazy-loaded in. These tests ended up being extremely brittle because I was trying to mock and mimic too much. There was just not enough value there.

### Data Setup

Now straying from best practices does come with some issues. Because we're going to the database, you now have to worry about data setup. All of the applications that I've worked on would be totally crippled if they didn't have some initial data in a database. It was just impractical to spin up an empty database for each run of a suite, much less each test. I've accomplished this in different ways, depending on the application.

For a small enough data set, I was able to use an existing database, output a SQL script, and use that as a starting point for tests. The script was about 20 MB, which is actually a sizable amount of test data. I was able to also spin up a [local instance of the database](https://gist.github.com/lloydkevin/be00721731fefa97448d80237108277b) to run my tests. These tests ran lightning fast, however, I was not a slave to keeping this script up to date with schema changes. You can be the judge of whether it's worth it for your application. In an application that uses Entity Framework Code First to maintain the database, this could be combined with some `Seed` method.

Where an on the fly database wasn't an option (typically data set was too large), I would use a database of some known state. This comes with its own set of compromises. You're then making certain assumptions about the database. For example: "Customer 222 is set up to accept credit card payments". Such assumptions add more breaking points for your tests, but they can make tests easier to write. It is the same case I've run into when doing manual testing. If someone screws up Customer 222, then everything is now broken. You would have to assess your application to figure out what the best balance is.

Because all of your tests now rely on a shared database, it's more critical to make sure that tests don't interact poorly with each other. I did have to find ways to isolate tests. I'm using NUnit for testing, so I have a `DatabaseFixture` that allows me to run every test in its own `TransactionScope`. That way, I'm able to rollback all database transactions when I'm done. This works great with tests that have legacy Stored Procedure work.

Another thing I learned from Jimmy is (paraphrasing)

> Use the application to create its own data

That means, avoid saving your test data straight to the database. You spend forever trying to figure out all of the appropriate dependencies for the data. You'll also struggle with building valid data that meets your application's business constraints. And testing with bad data is just setting up yourself for failure. I should know, I've had a lot of failures.

Instead, if you're testing `DeleteInvoice` as part of your test data setup, call `CreateInvoice`. Try your best to mimic the interactions that would take place if a user would be testing this. I've found it helps to ask myself:

1. How would QA create this data?
2. What would they look for to know it worked?

These questions help me with my setup data and my test assertions.

### Other Dependencies

Now that data is taken care of, I did have to find a way to handle other dependencies in the application. Luckily, all my projects have made use of some sort of IoC container. My tests needed to set this up in much the same way the real application did. So whatever *startup* code is being run, the tests were also responsible for that. I did have to modify the things that didn't apply (mainly the *per request* scoping of my IoC container).

Plug into your IoC container also gives you a great way to inject the few mocks you should need: things like external dependencies to other APIs, sending of emails, etc. Most of the APIs I end up testing are WebAPI. User validation is usually attached to `HttpContext.Current` in some way, shape, or form (as part of user claims, session, etc.). Now it's best if you can inject an `ICurrentUser` or something. These are easy to mock and plug into your IoC container. But where that's not possible, [faking the `HttpContext`](https://stackoverflow.com/questions/4379450/mock-httpcontext-current-in-test-init-method) is the next best thing.

### Test Helpers

Since I was doing all this data setup, it became apparent that the code wasn't very [DRY](https://dotnetcodr.com/2013/10/17/the-dont-repeat-yourself-dry-design-principle-in-net-part-1/). This added to the brittleness of the tests. When I needed to tweak something for Test A, I'd have to do it 5 more times. Enter *Test Helpers*. These aren't anything fancy. Just classes that help you create that data you need. They should help create data that are useful for your tests. Think `OrderHelper.CreateDefault()` that gets you a fully-fledged order for some default (known) customer, with default line items attached to it. They should include some mechanism (optional parameters, method overloads) to vary that default data when needed. This will keep them flexible.

Depending on the size of your domain you can go the official route of the [Test Builder Pattern](https://blog.ploeh.dk/2017/08/15/test-data-builders-in-c/) or you these can be simple helper methods. Whatever works. And if they are going to *use the application to create data* they would need access to your IoC container.

Pro Tip: When creating fake data [AutoFixture](https://github.com/AutoFixture/AutoFixture/) is your best friend.

### Reduced Development Feedback Loop

Now, these integration tests run a **lot** slower than unit tests, but they are a heck of a lot faster than:

- Launching the Visual Studio Debugger
- Launching the client/UI portion of your application
- Logging in
- Navigating to the correct page, menu, or dialog
- Searching for or creating the data you need

That was the real epiphany for me. I was able to test some user stories without even launching the application. You have no idea how freeing that is until you try it. I can just directly to the meat of what I'm trying to do. I can spin up different scenarios by duplicating some tests and tweaking inputs or using parametrized tests.

This made me much more willing to test out different test cases outside of the happy path. Whereas, if I had to launch the UI a 5th time and go set up data, I'd probably have just committed the code and pushed it out.

## Conclusion

Is this the best way? Of course not? Integration tests are slow, the slower the test suite, the less any developer wants to run them. The slower your CI builds are going to get. As your test suite increases, things will get slower.

**Solutions**

- Use Test attributes appropriately. Tests can be categorized by speed, business area, or criticality.
  - Developers can then run subsets of the entire suite where appropriate. Developers should at least run all the tests in a class they modify.
  - CI builds could be configured to run subsets based on criticality.
  - Scheduled CI builds can run the full suite after hours.
- Push more functionality to your domain objects.
  - If possible, you can push methods down to your domain objects.
  - Do this where it makes sense.
  - These can then be tested with *unit testing*.

Do I see a benefit here? Absolutely! You go from 0 tests to some tests! How can that not be awesome?

Now I have a long way to go to get to Test Driven Development, but it is putting it within my grasp.