---
title: "Which Sites Are Bad for Static Conversion"
description: "Not every site is suitable for static site generators (SSG)."
date: "2019-12-25T23:31:50-06:00"
url: /which-sites-bad-for-static-conversion
images: [images/posts/code.jpg]
categories:
  - "Blog"
tags:
  - "Static Site Generators"
---
As developers, we sometimes tend to want to throw our latest, new-found tech toy at every problem. After recently [converting this blog]({{< ref "2019-12-16-converting-to-static.md" >}}) from a WordPress site to a static HTML site using [Hugo](https://gohugo.io/), of course I've decided to try this elsewhere. Here's what I learned.

## Benefits of Static
There are a lot of examples ([1](https://www.strattic.com/jekyll-hugo-wordpress-pros-cons-static-site-generators/), [2](https://hackernoon.com/why-migrate-from-wordpress-to-a-static-site-generator-c9d46bd24710), [3](https://bejamas.io/blog/wordpress-alternative/)) showing the difference between Static Site Generators (SSG) and a CMS like WordPress. The pros of static sites are easy to see:
1. They are ridiculously fast. Without all the server-side rendering, it's easy to see how SSG would be blazing. Heck, you can cache your entire site up at CloudFlare at this point.
2. They can't be (easily) hacked. Now, someone getting a hold of your server credentials and replacing your static HTML content is still a possibility.
3. You need less hardware. Even when loading from cache, a WordPress site can sometimes drag under load. If you're on a shared host, you can sometimes get those nasty emails that you're using up too much CPU on the server.
4. Being static pays. You can get cheap or free hosting. Since no server-side software is needed you can host on things like GitHub Pages, Amazon S3, Azure Blob Storage, [Netlify](https://www.netlify.com/), etc.

## When Not to go Static
I won't go into detail with all the obvious examples:
1. Data on your site is dynamic: it changes without necessarily having content updates.
2. You have a _web app_ and not a _website_.
3. Your content editors aren't tech-savvy.

The reason I want to focus on here deals with the theme of the website.

One of the benefits of testing this out on an old blog is I wasn't attached to what I had before. I had some very basic requirements.
Honestly, they were more _nice to haves_ than requirements.
- I wanted all my content moved
- I wanted the domain name to be the same
- I wanted to maintain _most_ of my existing links (wanted to preserve what little SEO there was)

That's about it. I wasn't attached to the look at feel of the old site. It was more than time for a makeover anyway.
So that made converting a blog relatively easy. I decided to try converting some client websites, but those didn't go as smoothly.

## Converting a WordPress Theme
I found the theme building process much simpler with Hugo that I remember with WordPress.
There were so many plugins that enqueued there own JS and CSS that it became difficult to follow what was going on.
I ended up giving up on that and just focusing on the HTML output while viewing the page. This got me mainly what I wanted. I was able to extract Hugo partials for a header, footer, and body relatively easily. This process reminded me of how messy WordPress HTML output is, due to the amount of flexibility it gives you. So far, so good.

Things quickly fell apart when it came to content pages. The websites I tried to convert would fall under the category of _small business website_. The pages on these sites just didn't fall nicely into the Front Matter and Content schema as easily as something like _blog posts_ would.

The _content_ of those pages was littered with HTML markup for all sorts of things:
1. Image Sliders. These would typically live on the homepage.
2. Call To Action buttons.
3. _Sections_. A way to break up a long page, typically found on your "Single Page" type websites.
4. Other specifically styled elements.

In most of my WordPress sites, these pages usually were born from something like [Divi](https://www.elegantthemes.com/gallery/divi/) Builder, [Visual Composer](https://visualcomposer.com/), and more recently, [Gutenberg](https://wordpress.org/gutenberg/). These tools give you amazing flexibility without having to do a lot of theme or template editing. Everything is visual, everything is drag, drop, edit and publish. You can add full-width sections, image slide galleries, content separated in different columns, etc. It's great for a CMS. But horrible when trying to recreate these things. The HTML markup generated is horrible.

So, for these pages, my options were limited. I could abandon Markdown and copy and paste the generated HTML.
Markup be damned, I guess. Or I could build each of these pages as it's own Hugo template and still have all the markup.

By far, the worst option would be to attempt to recreate what the WordPress page builder was doing in Hugo shortcodes.

## Conclusion
In the end, I'm thinking these small business websites might not be great candidates for a Static Site Generator.
Ignoring the fact that a business owner probably wouldn't be tech-savvy enough to use these, the verbatim conversion of the themes posed a lot of challenges.

If I was forced to, a better (and more time consuming) approach would be to use individual templates for the pages. Identify the various _blocks_ of data and implement those using the Hugo Data for the site. But in the name of _quick and dirty_, we could just dump the markup into a Hugo Template file. Not the most maintainable or pretty, but it would get the job done.